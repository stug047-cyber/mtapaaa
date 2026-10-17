-- =====================================================================
-- مخطط وجداول قاعدة بيانات نظام متابعة الأقساط وطابور المواعيد والتحصيل
-- Database Schema for Installments, Appointment Queue & Branch Management System
-- متوافق مع: PostgreSQL / MySQL 8+ / SQLite 3 / Supabase / Neon
-- تاريخ الإنشاء: 2026-10-17
-- =====================================================================

-- =====================================================================
-- 1. جدول الفروع (branches)
-- إدارة الفروع المستقلة وصلاحيات الرؤية المتبادلة
-- =====================================================================
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,                           -- اسم الفرع (مثال: الفرع الرئيسي - بغداد)
    code VARCHAR(32) NOT NULL UNIQUE,                     -- رمز/كود الفرع (مثال: BGD-01)
    address VARCHAR(255),                                 -- عنوان وموقع الفرع
    phone VARCHAR(32),                                    -- رقم هاتف الفرع
    manager_name VARCHAR(120),                            -- اسم مدير الفرع
    manager_id VARCHAR(64),                               -- معرف المدير من جدول المستخدمين
    can_view_other_branches BOOLEAN NOT NULL DEFAULT FALSE, -- هل يحق لموظفي هذا الفرع رؤية بيانات الفروع الأخرى (تحكم مدير النظام)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,              -- حالة الفرع (نشط / معطل)
    notes TEXT,                                           -- ملاحظات إضافية عن الفرع
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);

-- =====================================================================
-- 2. جدول المستخدمين والموظفين (users)
-- حسابات مدراء النظام، مدراء الفروع، والمحصلين مع الصلاحيات الدقيقة
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,                 -- اسم المستخدم لتسجيل الدخول
    email VARCHAR(128) NOT NULL UNIQUE,                   -- البريد الإلكتروني
    password_hash VARCHAR(255) NOT NULL,                  -- كلمة المرور المشفرة (PBKDF2/bcrypt)
    name VARCHAR(120) NOT NULL,                           -- الاسم الكامل للموظف
    role VARCHAR(32) NOT NULL DEFAULT 'agent',            -- الدور: admin (مدير عام), branch_manager (مدير فرع), agent (محصل)
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL, -- الفرع التابع له الموظف
    branch_name VARCHAR(150),                             -- اسم الفرع للعرض السريع
    phone VARCHAR(32),                                    -- رقم هاتف الموظف للتواصل الداخلي
    is_active BOOLEAN NOT NULL DEFAULT TRUE,              -- تفعيل أو تعطيل حساب الموظف
    can_view_other_branches_override BOOLEAN DEFAULT NULL, -- استثناء خاص من مدير النظام لتجاوز إعداد الفرع
    permissions JSON,                                     -- مصفوفة الصلاحيات المخصصة بصيغة JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

-- =====================================================================
-- 3. جدول العملاء / أصحاب الأقساط (clients)
-- بيانات الزبائن، المديونيات، والكفلاء الضامنين
-- =====================================================================
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,                           -- الاسم الرباعي للعميل
    phone VARCHAR(32) NOT NULL,                           -- رقم الهاتف الأساسي
    national_id VARCHAR(64),                              -- رقم البطاقة الوطنية / الهوية
    email VARCHAR(128),                                   -- البريد الإلكتروني
    address VARCHAR(255),                                 -- عنوان السكن الحالي
    notes TEXT,                                           -- ملاحظات عامة وسجل التعامل
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL, -- الفرع المسجل به العميل
    branch_name VARCHAR(150),                             -- اسم الفرع
    
    -- بيانات الكفيل الضامن الأساسي
    guarantor_name VARCHAR(150),                          -- اسم الكفيل الضامن
    guarantor_phone VARCHAR(32),                          -- رقم هاتف الكفيل
    guarantor_relation VARCHAR(64),                       -- صلة القرابة بالكفيل
    guarantor_national_id VARCHAR(64),                    -- هوية الكفيل
    guarantor_address VARCHAR(255),                       -- سكن الكفيل
    
    -- ملخص المتابعات والوعود
    last_call_date TIMESTAMP WITH TIME ZONE,              -- تاريخ آخر اتصال تم معه
    last_call_result VARCHAR(64),                         -- نتيجة آخر مكالمة
    next_promise_date DATE,                               -- تاريخ موعد السداد الموعود به (YYYY-MM-DD)
    promise_amount DECIMAL(14, 2) DEFAULT 0,              -- المبلغ الموعود بدفعه
    total_debt DECIMAL(14, 2) DEFAULT 0,                  -- إجمالي الدين المطلوب من الزبون
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_national_id ON clients(national_id);
CREATE INDEX IF NOT EXISTS idx_clients_branch_id ON clients(branch_id);
CREATE INDEX IF NOT EXISTS idx_clients_next_promise ON clients(next_promise_date);

-- =====================================================================
-- 4. جدول دليل الكفلاء الضامنين (guarantors)
-- أرشيف متكامل للكفلاء لسرعة الاقتراح والربط وعدم تكرار البيانات
-- =====================================================================
CREATE TABLE IF NOT EXISTS guarantors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,                           -- اسم الكفيل الكامل
    phone VARCHAR(32) NOT NULL,                           -- هاتف الكفيل
    national_id VARCHAR(64),                              -- الرقم الوطني / هوية الأحوال
    address VARCHAR(255),                                 -- عنوان سكن الكفيل
    relation VARCHAR(64),                                 -- صلة القرابة الافتراضية
    notes TEXT,                                           -- ملاحظات حول الكفيل وملاءته المالية
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guarantors_phone ON guarantors(phone);
CREATE INDEX IF NOT EXISTS idx_guarantors_name ON guarantors(name);

-- =====================================================================
-- 5. جدول طابور المواعيد والتحصيل (appointments)
-- الطابور الذكي للمواعيد المستحقة، التنبيهات الصوتية، ومتابعة السداد
-- =====================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    queue_number INT NOT NULL,                            -- رقم الدور في الطابور (1، 2، 3...)
    client_name VARCHAR(150) NOT NULL,                    -- اسم صاحب الموعد
    client_phone VARCHAR(32) NOT NULL,                    -- رقم هاتف صاحب الموعد
    guarantor_name VARCHAR(150) NOT NULL,                 -- اسم الكفيل الضامن
    guarantor_phone VARCHAR(32) NOT NULL,                 -- رقم هاتف الكفيل
    required_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,    -- المبلغ المطلوب للدفع (دينار عراقي د.ع)
    paid_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,        -- المبلغ المسدد حتى الآن
    remaining_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,   -- المبلغ المتبقي (المطلوب - المسدد)
    appointment_date DATE NOT NULL,                       -- تاريخ استحقاق الموعد (YYYY-MM-DD)
    appointment_time VARCHAR(8) DEFAULT '10:00',          -- وقت الموعد (HH:MM)
    status VARCHAR(32) NOT NULL DEFAULT 'waiting',        -- الحالة: waiting, today, overdue, paid, partially_paid, postponed, referred_to_guarantor, refused
    priority VARCHAR(16) NOT NULL DEFAULT 'normal',       -- الأولوية: normal (عادي), important (مهم), urgent (عاجل)
    notes TEXT,                                           -- ملاحظات وسبب الموعد
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL, -- الربط بملف العميل إن وجد
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL, -- الفرع التابع له الموعد
    branch_name VARCHAR(150),                             -- اسم الفرع
    
    -- تفاصيل التنبيه المجدول (Scheduled Alert)
    scheduled_alert_at TIMESTAMP WITH TIME ZONE,          -- وقت إطلاق إشعار التنبيه
    reminder_type VARCHAR(32) DEFAULT '1h_before',        -- نوع التذكير: at_appointment, 15m_before, 1h_before, 1d_before, custom
    custom_date DATE,                                     -- تاريخ مخصص للتنبيه
    custom_time VARCHAR(8),                               -- وقت مخصص للتنبيه
    alert_note TEXT,                                      -- نص التنبيه المخصص
    notify_guarantor BOOLEAN DEFAULT TRUE,                -- إشعار الكفيل أيضاً بالموعد
    is_alert_triggered BOOLEAN DEFAULT FALSE,             -- هل تم إطلاق التنبيه الفعلي
    alert_triggered_at TIMESTAMP WITH TIME ZONE,          -- وقت إطلاق التنبيه
    
    -- تتبع التأجيلات والموعد الأصلي
    original_appointment_date DATE,                       -- تاريخ الموعد الأصلي عند تسجيله أول مرة
    postponement_count INT DEFAULT 0,                     -- عدد مرات تأجيل الموعد
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_priority ON appointments(priority);
CREATE INDEX IF NOT EXISTS idx_appointments_branch ON appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone ON appointments(client_phone);

-- =====================================================================
-- 6. جدول سجل تأجيل المواعيد (appointment_postponements)
-- أرشفة كاملة لكل مرة يتم فيها تأجيل موعد مع السبب وهوية الموظف
-- =====================================================================
CREATE TABLE IF NOT EXISTS appointment_postponements (
    id VARCHAR(64) PRIMARY KEY,
    appointment_id VARCHAR(64) NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    previous_date DATE NOT NULL,                          -- التاريخ السابق قبل التأجيل
    previous_time VARCHAR(8),                             -- الوقت السابق
    new_date DATE NOT NULL,                               -- التاريخ الجديد بعد التأجيل
    new_time VARCHAR(8),                                  -- الوقت الجديد
    postponed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- تاريخ ووقت تسجيل التأجيل
    postponed_by VARCHAR(120),                            -- اسم الموظف الذي قام بالتأجيل
    reason TEXT,                                          -- سبب التأجيل أو مبرر العميل
    call_result VARCHAR(64)                               -- نتيجة المكالمة المقترنة
);

CREATE INDEX IF NOT EXISTS idx_postponements_appointment ON appointment_postponements(appointment_id);

-- =====================================================================
-- 7. جدول الأقساط الشهرية (installments)
-- جدول الدفعات والأقساط المجدولة المرتبطة بالزبائن
-- =====================================================================
CREATE TABLE IF NOT EXISTS installments (
    id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(32) NOT NULL,
    guarantor_name VARCHAR(150),
    guarantor_phone VARCHAR(32),
    amount DECIMAL(14, 2) NOT NULL DEFAULT 0,             -- مبلغ القسط المحدد
    paid_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,         -- المبلغ المسدد من هذا القسط
    due_date DATE NOT NULL,                               -- تاريخ استحقاق القسط (YYYY-MM-DD)
    status VARCHAR(32) NOT NULL DEFAULT 'unpaid',         -- الحالة: unpaid, paid, partially_paid, overdue, promised, postponed, referred_to_guarantor
    notes TEXT,
    promised_date DATE,                                   -- تاريخ الوعد الجديد بالسداد إن وجد
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_installments_client_id ON installments(client_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);

-- =====================================================================
-- 8. جدول المدفوعات وسندات القبض (payments)
-- توثيق كل عملية تسديد نقدية أو بنكية للمواعيد والأقساط
-- =====================================================================
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    appointment_id VARCHAR(64) REFERENCES appointments(id) ON DELETE SET NULL,
    installment_id VARCHAR(64) REFERENCES installments(id) ON DELETE SET NULL,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name VARCHAR(150) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,                       -- المبلغ المسدد
    payment_date DATE NOT NULL,                           -- تاريخ الدفع الفعلي
    payment_method VARCHAR(32) NOT NULL DEFAULT 'cash',   -- طريقة الدفع: cash (نقداً), zain_cash (زين كاش), qi_card (كي كارد), bank_transfer (تحويل بنكي), card (بطاقة)
    reference_no VARCHAR(64),                             -- رقم الوصل / مرجع التحويل
    notes TEXT,
    recorded_by VARCHAR(120),                             -- اسم الموظف المستلم للدفعة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);

-- =====================================================================
-- 9. جدول سجل المكالمات والمتابعات الهاتفية (call_logs)
-- توثيق تفاصيل الاتصالات مع العميل والكفيل والنتائج والوعود
-- =====================================================================
CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(32) NOT NULL,
    guarantor_name VARCHAR(150),
    guarantor_phone VARCHAR(32),
    caller_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    caller_name VARCHAR(120) NOT NULL,                    -- اسم الموظف المتصل
    call_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- توقيت الاتصال
    result VARCHAR(32) NOT NULL,                          -- رمز النتيجة: promised, no_answer, phone_off, excuse, postponed, referred_to_guarantor, refused, paid_already
    result_label VARCHAR(64) NOT NULL,                    -- وصف النتيجة باللغة العربية
    promised_date DATE,                                   -- تاريخ موعد السداد الموعود
    promised_amount DECIMAL(14, 2) DEFAULT 0,             -- المبلغ الموعود
    notes TEXT,                                           -- تفاصيل المحادثة
    status VARCHAR(32) DEFAULT 'pending',                 -- حالة الوعد: pending (قيد الانتظار), fulfilled (تم الوفاء), broken (نُكث)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_logs_client ON call_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_result ON call_logs(result);

-- =====================================================================
-- 10. جدول الإشعارات والتنبيهات المجدولة (notifications)
-- تنبيهات الخادم ومواعيد الاستحقاق اليومية والتحذيرات
-- =====================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,                            -- نوع التنبيه: due_today, upcoming, overdue, payment_received, scheduled_alert, promise_due, promise_broken
    appointment_id VARCHAR(64) REFERENCES appointments(id) ON DELETE CASCADE,
    installment_id VARCHAR(64) REFERENCES installments(id) ON DELETE CASCADE,
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE CASCADE,
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(32),
    guarantor_name VARCHAR(150),
    guarantor_phone VARCHAR(32),
    amount DECIMAL(14, 2) DEFAULT 0,
    due_date DATE,
    title VARCHAR(150) NOT NULL,                          -- عنوان الإشعار
    message TEXT NOT NULL,                                -- نص الإشعار الكامل
    is_read BOOLEAN NOT NULL DEFAULT FALSE,               -- هل تمت قراءته
    scheduled_for TIMESTAMP WITH TIME ZONE,               -- وقت الجدولة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);

-- =====================================================================
-- 11. جدول إعدادات النظام العامة (app_settings)
-- تخزين اسم المنشأة، العملة (د.ع)، خيارات التنبيهات، والفرع الافتراضي
-- =====================================================================
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'current_settings',
    business_name VARCHAR(150) NOT NULL DEFAULT 'نظام متابعة الأقساط والمواعيد',
    currency VARCHAR(16) NOT NULL DEFAULT 'د.ع',
    notify_days_before JSON,                              -- أيام التنبيه المسبقة (مثال: [1, 3, 7])
    auto_check_interval_minutes INT DEFAULT 10,           -- فترة فحص التنبيهات بالدقائق
    last_cron_check TIMESTAMP WITH TIME ZONE,             -- آخر فحص آلي في الخلفية
    custom_statuses JSON,                                 -- حالات مخصصة إضافية
    sound_enabled BOOLEAN DEFAULT TRUE,                   -- تفعيل أصوات التنبيه
    default_branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
    enforce_branch_isolation BOOLEAN DEFAULT FALSE,       -- فرض العزل الصارم بين الفروع
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- بيانات أولية قياسية (Seed Data) لتشغيل النظام فور نقل الجداول
-- =====================================================================

-- فرع رئيسي افتراضي
INSERT INTO branches (id, name, code, address, phone, manager_name, can_view_other_branches, is_active, notes)
VALUES ('branch_main', 'الفرع الرئيسي - بغداد', 'BGD-01', 'بغداد - المنصور - شارع 14 رمضان', '07700000001', 'مدير النظام', TRUE, TRUE, 'الفرع الرئيسي للمنظومة')
ON CONFLICT (id) DO NOTHING;

-- حساب مدير النظام الافتراضي (كلمة المرور الافتراضية: admin123)
INSERT INTO users (id, username, email, password_hash, name, role, branch_id, branch_name, phone, is_active, can_view_other_branches_override)
VALUES ('user_admin_1', 'admin', 'admin@aqsat.com', 'acc8025543fa09b84c798445311dcb41:8a6a1d81e7fb33f17fab3c45d6cf6daff2b25892fd8a2877db675908be4a5a31b38e2fea2c1f39a481aafef959c16bb7e2c0f506086fb21944767c0d28ee3125', 'مدير النظام العام', 'admin', 'branch_main', 'الفرع الرئيسي - بغداد', '07700000001', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- الإعدادات الافتراضية للنظام
INSERT INTO app_settings (id, business_name, currency, notify_days_before, auto_check_interval_minutes, sound_enabled, default_branch_id)
VALUES ('current_settings', 'شركة الإسناد لمتابعة الأقساط والتحصيل', 'د.ع', '[1, 3, 7]', 10, TRUE, 'branch_main')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- نهاية ملف مخطط قواعد البيانات
-- End of Database Schema File
-- =====================================================================
