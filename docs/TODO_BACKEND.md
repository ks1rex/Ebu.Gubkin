# TODO: Backend / DB changes needed

> Обновлено: 2026-06-14. Миграции 000–017 применены через MCP.

---

## ✅ Применённые миграции (все через MCP, ручной запуск не нужен)

| Миграция | Содержание |
|---|---|
| 000–013 | Базовая схема (profiles, orders, wallet, RLS, storage) |
| 014 | Форум: таблицы + RLS + стартовые категории |
| 015 | RPC `increment_thread_views` |
| 016 | ГОСТ: `gost_token_price` в `admin_settings`, enum `balance_to_token`, RPC `buy_gost_tokens` |
| 017 | Финансы: `meta` + `platform_profit` в `transactions`, enum `deposit_referral`, `platform_expenses` в admin_settings, обновлён RPC buy_gost_tokens |
| 018 | RPC `claim_referral_bonus_slot` — атомарная выдача реферального слота (исключает гонку при выплате бонуса) |

---

---

## ⚠️ Требует ручной настройки

### 1. Переменные окружения backend на Render

В Render Dashboard → сервис `reshbirga` → Environment Variables добавь:

```
DEEPSEEK_API_KEY=<ключ DeepSeek>          # для AI-модерации форума
TELEGRAM_BOT_TOKEN=<токен бота>           # для уведомлений о AI-флагах
TELEGRAM_CHAT_ID=963889378                # ID чата (уже задан как default)
FRONTEND_URL=https://<твой-фронтенд>.github.io
GOST_BACKEND_URL=https://gost-calculator-backend.onrender.com  # URL ГОСТ-сервиса (Sait)
```

Без `DEEPSEEK_API_KEY` AI-модерация не запускается, посты сразу получают статус `approved`.
Без `TELEGRAM_BOT_TOKEN` уведомления не отправляются (не блокирует работу).

### 2. Категории форума

4 стартовые категории добавлены в миграции 014. Новые категории создаёт только админ
через будущую админ-панель (Этап 6). Для ручного добавления:

```sql
INSERT INTO forum_categories (name, description, icon_name, sort_order)
VALUES ('Название', 'Описание', 'IconName', 5);
```

Допустимые `icon_name`: `MessageCircle`, `BookOpen`, `Briefcase`, `Megaphone`, `MessagesSquare`.

### 3. Пометить аккаунт как is_admin

```sql
UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com';
```

---

## Пункты и статусы

### ✅ 1. Trigger: auto-create profile on registration

**Статус**: SQL написан — `008_handle_new_user.sql`.  
**Требует**: вставить в Supabase SQL Editor.  

Триггер:
- создаёт строку в `profiles` при регистрации
- генерирует уникальный `referral_code`
- читает `nickname` из `auth.signUp({ options: { data: { nickname } } })`
- разрешает реферальный код из `ref_code` в метаданных

**Фронтенд**: ручной `upsert` в `AuthContext.tsx` удалён — профиль теперь создаёт только триггер.

---

### ✅ 2. GET /profile и PUT /profile эндпоинты

**Статус**: реализованы в `reshbirga/backend/src/routes/profile.js`, смонтированы в `app.js`.

| Метод | Путь | Описание |
|---|---|---|
| GET | `/profile` | Полный профиль авторизованного пользователя |
| PUT | `/profile` | Обновление: `full_name`, `phone`, `telegram_username`, `university_group`, `avatar_url`, `nickname` |

Чувствительные поля (`balance`, `is_admin`, `has_access` и т.д.) заблокированы на уровне роутера — менять их через этот endpoint невозможно.

---

### ✅ 3. RLS на таблице `profiles` (SELECT)

**Статус**: SQL написан — `011_ensure_rls.sql`, политика `ebu_profiles_select_authenticated`.  
**Требует**: вставить в Supabase SQL Editor.

```sql
-- Уже включено в 011_ensure_rls.sql:
CREATE POLICY ebu_profiles_select_authenticated
  ON public.profiles FOR SELECT TO authenticated USING (true);
```

---

### ✅ 4. RLS на таблице `transactions`

**Статус**: SQL написан — `011_ensure_rls.sql`, политики `ebu_transactions_select_own` и `ebu_transactions_select_admin`.  
**Требует**: вставить в Supabase SQL Editor.

---

### ✅ 5. VIEW `wallets` + доступ

**Статус**: SQL написан — `012_wallets_view.sql`.  
**Требует**: вставить в Supabase SQL Editor.

Создаёт VIEW:
```sql
SELECT id AS user_id, balance, updated_at FROM public.profiles;
```
С `security_invoker = true` — VIEW наследует RLS профиля, пользователь видит только свою строку.

---

### ✅ 6. RLS на `site_settings` (чтение реквизитов)

**Статус**: SQL написан — `011_ensure_rls.sql`, политика `ebu_settings_select`.  
**Требует**: вставить в Supabase SQL Editor.

---

### ✅ 7. Supabase Storage: бакет `avatars`

**Статус**: SQL написан — `013_storage_avatars.sql`.  
**Требует**: вставить в Supabase SQL Editor.

Создаёт бакет `avatars` (public, лимит 5 МБ, только image/*) и три RLS-политики:
- `ebu_avatars_insert` — пользователь загружает только в свою папку `{user_id}/`
- `ebu_avatars_update` — пользователь перезаписывает только своё
- `ebu_avatars_select` — публичное чтение (бакет public)

---

### ⚠️ 8. Переменная VITE_BACKEND_URL

**Статус**: требует ручной настройки.

Добавьте в `Ebu.Gubkin/.env.local`:
```
VITE_BACKEND_URL=https://<your-app>.onrender.com
```

URL находится в Render Dashboard → ваш backend-сервис → Settings.  
Без этой переменной кнопки «Пополнить» и «Вывести» показывают ошибку в toast.

Также убедитесь, что на Render у backend-сервиса в Environment Variables установлена:
```
FRONTEND_URL=https://<ваш-фронтенд>.github.io
```

---

## Что проверить после применения SQL

1. Зарегистрируйте нового пользователя → убедитесь, что строка в `profiles` создалась автоматически с `referral_code`
2. Откройте `/wallet` — баланс и история операций должны загружаться
3. Откройте `/profile` → редактирование → сохранить аватар → убедитесь, что фото появилось
4. Проверьте `GET /profile` через Postman или браузер с Bearer-токеном

---

## Примечание о lock_writes (010_lock_writes.sql)

После применения 010-го файла клиентский frontend (anon/authenticated) **не может**:
- INSERT/DELETE в profiles (только триггер/сервис)
- INSERT/UPDATE/DELETE в orders, transactions, disputes и других таблицах

Фронтенд **может**:
- UPDATE profiles (только безопасные поля — через RLS `ebu_profiles_update_self`)
- INSERT в messages и message_attachments (только свои)
- SELECT везде, где есть policy
