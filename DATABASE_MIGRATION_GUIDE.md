# دليل نقل وتصدير جداول وقواعد بيانات نظام متابعة الأقساط والمواعيد
## Database Tables & Migration Guide

تم إنشاء هذا الدليل وملف `database_schema.sql` لتسهيل نقل وترحيل جداول النظام إلى أي محرك قواعد بيانات علائقية (PostgreSQL / MySQL / Supabase / SQLite / Neon).

---

### 1. قائمة الجداول المعتمدة (11 جدولاً)

| # | اسم الجدول (Table Name) | الوصف بالعربية | الاستخدام الأساسي |
|---|---|---|---|
| 1 | `branches` | الفروع والمقرات | إدارة شبكة الفروع وصلاحيات الرؤية المتبادلة |
| 2 | `users` | المستخدمين والموظفين | حسابات المدراء والمحصلين وصلاحياتهم |
| 3 | `clients` | العملاء وأصحاب الديون | بيانات الزبائن وتفاصيل الكفلاء والديون الكلية |
| 4 | `guarantors` | دليل الكفلاء الضامنين | أرشيف موحد لبيانات الكفلاء لسرعة الربط والاقتراح |
| 5 | `appointments` | طابور المواعيد والتحصيل | مواعيد الحضور والسداد مع التنبيهات المجدولة |
| 6 | `appointment_postponements` | سجل تأجيل المواعيد | أرشفة التواريخ السابقة وأسباب التأجيل |
| 7 | `installments` | الأقساط الشهرية | خطط الأقساط وجدول الاستحقاقات والمدفوع منها |
| 8 | `payments` | سندات القبض والمدفوعات | توثيق الدفعات النقدية والتحويلات المالية (زين كاش، كي كارد) |
| 9 | `call_logs` | سجل الاتصالات والمتابعات | نتائج المكالمات الهاتفية والوعود بالسداد |
| 10 | `notifications` | الإشعارات والتنبيهات | إشعارات الاستحقاق اليومية والتذكيرات الآلية |
| 11 | `app_settings` | إعدادات النظام | اسم المنشأة، العملة، فترات الفحص الآلي والفرع الافتراضي |

---

### 2. العلاقات ومفاتيح الربط (Foreign Keys)

- `users.branch_id` ➔ `branches.id`
- `clients.branch_id` ➔ `branches.id`
- `appointments.client_id` ➔ `clients.id`
- `appointments.branch_id` ➔ `branches.id`
- `appointment_postponements.appointment_id` ➔ `appointments.id` (ON DELETE CASCADE)
- `installments.client_id` ➔ `clients.id` (ON DELETE CASCADE)
- `payments.client_id` ➔ `clients.id` (ON DELETE CASCADE)
- `payments.appointment_id` ➔ `appointments.id`
- `payments.installment_id` ➔ `installments.id`
- `call_logs.client_id` ➔ `clients.id` (ON DELETE CASCADE)
- `call_logs.caller_user_id` ➔ `users.id`
- `notifications.client_id` ➔ `clients.id`
- `notifications.appointment_id` ➔ `appointments.id`

---

### 3. تعليمات استيراد الجداول وتشغيلها

#### أ) استيراد إلى PostgreSQL / Supabase / Neon:
```bash
psql -h <HOST> -U <USER> -d <DATABASE_NAME> -f database_schema.sql
```
أو عبر واجهة Supabase / Neon SQL Editor:
قم بنسخ محتوى ملف `database_schema.sql` ولصقه مباشرة في محرر SQL ثم اضغط `Run`.

#### ب) استيراد إلى MySQL 8+:
```bash
mysql -u <USER> -p <DATABASE_NAME> < database_schema.sql
```

#### ج) استيراد إلى SQLite 3:
```bash
sqlite3 app_database.db < database_schema.sql
```

---

### 4. التوافق والأنواع المستخدمة
- استخدام `VARCHAR` و `DECIMAL(14, 2)` لضمان دقة الحسابات المالية (دينار عراقي د.ع).
- استخدام `TIMESTAMP WITH TIME ZONE` و `DATE` للتواريخ الزمنية العالمية.
- استخدام `BOOLEAN` للعلامات الثنائية (التفعيل وصلاحية الرؤية).
- فهارس `INDEX` مهيأة على أرقام الهواتف، الفروع، والحالات لضمان سرعة الاستعلامات حتى مع ملايين السجلات.
