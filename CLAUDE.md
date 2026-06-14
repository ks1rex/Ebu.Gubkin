# Ebu.Gubkin — Context Document for New Frontend Repository

> **This document is self-contained.** A developer starting the new frontend repo from scratch, without access to the `reshbirga` backend repo, should find everything needed here.

---

## 1. Project Overview

**Ebu.Gubkin** — единый студенческий портал Губкинского университета, объединяющий четыре раздела в одном сайте с общим профилем и кошельком:

| Раздел | Описание | Статус |
|---|---|---|
| **Биржа** | Студенческая биржа учебных услуг (заказы, исполнители, споры) | Работает (backend готов) |
| **Форум** | Тематические обсуждения по предметам, курсам, жизни универа | Планируется |
| **ГОСТ-калькулятор** | AI-генерация документов по ГОСТ, токенная оплата | Работает (отдельный backend) |
| **Кошелёк** | Рублёвый баланс для Биржи, токены ГОСТ — всё в одном профиле | Работает |

**Ключевая идея**: единый `auth.users` → единый `profiles` → единый кошелёк. Пользователь регистрируется один раз и получает доступ ко всем разделам.

---

## 2. Supabase — единая БД

**Проект**: ГОСТ-калькулятор (все разделы используют одну БД)
- **Project ID**: `btcpbvevytmhgkevhnyj`
- **URL**: `https://btcpbvevytmhgkevhnyj.supabase.co`
- **Auth**: включён (email + password), Supabase Auth

### Переменные окружения для frontend

```env
VITE_SUPABASE_URL=https://btcpbvevytmhgkevhnyj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3BidmV2eXRtaGdrZXZobnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTU2NzgsImV4cCI6MjA5Njc3MTY3OH0.rKc2XvfLCsaD_WM7BwYtliDhIg12FJ_7VDX_iXIX7mk
VITE_BACKEND_URL=https://<render-app>.onrender.com  # URL биржи backend на Render
```

---

## 3. Полная схема БД

### 3.1 Таблицы ГОСТ-калькулятора (НЕ ТРОГАТЬ — только читать)

| Таблица | Описание | Ключевые поля |
|---|---|---|
| `access_codes` | Коды активации ГОСТ | `code`, `tokens`, `used_by→profiles` |
| `projects` | ГОСТ-проекты пользователей | `user_id`, `title`, `status`, `generation_mode` |
| `chat_messages` | AI-переписка в рамках ГОСТ-проекта | `project_id`, `role`, `content` |
| `project_files` | Выходные файлы ГОСТ (docx/pdf) | `project_id`, `file_type`, `storage_path` |
| `custom_templates` | Пользовательские шаблоны ГОСТ | `project_id`, `sub_mode`, `source_storage_path` |
| `calculation_specs` | JSON-спецификации расчётов | `project_id`, `spec_json` |
| `ai_usage` | Логи AI-токенов (провайдер, модель) | `user_id`, `project_id`, `input_tokens`, `output_tokens` |
| `token_transactions` | Транзакции ГОСТ-токенов | `user_id`, `amount`, `reason` |

### 3.2 Общий профиль (расширенная таблица `profiles`)

```sql
profiles (
  -- GOST-поля (не менять)
  id                uuid PK → auth.users,
  email             text,
  has_access        boolean,        -- есть ли доступ к ГОСТ
  access_expires_at timestamptz,
  unlimited_access  boolean,
  token_balance     integer,        -- ГОСТ-токены
  is_admin          boolean,
  -- Биржа / унифицированные поля
  nickname          text UNIQUE,    -- никнейм на бирже
  full_name         text,
  avatar_url        text,
  phone             text,
  telegram_username text,
  university_group  text,
  is_banned         boolean,
  -- Кошелёк (рублёвый баланс для Биржи)
  balance           numeric(12,2),
  last_deposit_confirmed_at timestamptz,
  -- Реферальная программа
  referral_code     text UNIQUE,    -- 8-char hex
  referred_by       uuid → profiles,
  referral_earnings numeric(12,2),
  referral_registered_count    integer,
  referral_qualifying_deposits_count integer,
  -- Рейтинги (биржа)
  rating_as_customer numeric(3,2),
  rating_as_executor numeric(3,2),
  reviews_count_customer integer,
  reviews_count_executor integer,
  created_at        timestamptz,
  updated_at        timestamptz
)
```

### 3.3 Кошелёк

```sql
-- VIEW на profiles (всегда актуально, без sync):
wallets (user_id, balance, updated_at)

-- Ledger транзакций:
transactions (
  id, user_id→profiles, order_id→orders,
  type  enum(deposit, withdrawal, order_payment, order_cancel_refund,
             order_topup, order_payout, dispute_refund_customer,
             deposit_hold, deposit_release, deposit_forfeit, referral_bonus, ...),
  amount numeric(12,2), status enum(pending,completed,rejected),
  processed_by→profiles, admin_comment, created_at
)

-- Заявки на пополнение (ручное подтверждение админом):
deposit_requests (
  id, user_id, claimed_amount, confirmed_amount, credited_amount,
  status (pending/confirmed/rejected), admin_comment,
  referral_bonus_applied, referral_bonus_amount,
  processed_by, processed_at, created_at
)

-- Заявки на вывод:
withdrawal_requests (
  id, user_id, amount, card_number,
  status (pending/confirmed/rejected), admin_comment,
  processed_by, processed_at, created_at
)
```

### 3.4 Биржа

```sql
orders (
  id, customer_id→profiles, executor_id→profiles,
  title, description, subject, order_type (text, default 'order'),
  base_amount, final_amount, commission_amount, reserved_amount, required_topup,
  deposit_amount,
  status enum(pending_payment, open, awaiting_topup, in_progress,
              awaiting_confirmation, completed, disputed, cancelled),
  requires_contact_exchange, contact_exchange_reason,
  confirmed_by_customer, confirmed_by_executor, confirmation_deadline,
  completed_at, created_at, updated_at
)

order_applications (id, order_id, executor_id, message, proposed_amount, status, created_at)
order_attachments  (id, order_id, uploaded_by, file_path, file_name, file_size, visibility, created_at)

listings (
  id, owner_id→profiles, title, description, price, deposit_amount,
  requires_contact_exchange, contact_exchange_reason, is_active, created_at, updated_at
)

disputes (
  id, order_id, opened_by→profiles, reason,
  status enum(open, resolved_refund_customer, resolved_pay_executor, resolved_site_error),
  admin_comment, resolved_by, resolved_at, created_at
)

reviews (
  id, order_id, reviewer_id→profiles, reviewee_id→profiles,
  context enum(as_customer, as_executor), rating(1-5), comment, created_at
)
```

### 3.5 Чат биржи

```sql
conversations (id, type enum(order_chat, support_ticket), order_id, support_ticket_id, created_at)

conversation_participants (
  id, conversation_id, user_id→profiles,
  role enum(customer, executor, admin, support_user)
)

messages (
  id, conversation_id, sender_id→profiles (NULL = системное сообщение),
  content, is_contact_info, moderation_reviewed,
  ai_suspected, ai_checked_at, created_at
)

message_attachments (id, message_id, file_path, file_name, file_size)
```

Realtime включён для таблицы `messages`.

### 3.6 Поддержка

```sql
support_tickets (id, user_id, subject, status enum(open,answered,closed), created_at)
```

### 3.7 Модерация чата

```sql
chat_moderation_log (
  id, message_id, conversation_id, sender_id,
  reason enum(extremism, advertising, spam),
  detection_method (regex | ai),
  snippet,               -- короткая выдержка из сообщения
  reviewed_by, reviewed_at,
  action_taken (dismissed | warned | banned | message_deleted),
  created_at
)
```

**Что модерируется**: экстремизм/нацистская/геноцидная риторика; явная реклама сторонних сервисов; спам/флуд.  
**Что НЕ модерируется**: мат, обмен контактами между сторонами сделки.

### 3.8 Настройки

```sql
site_settings  (id, key UNIQUE, value, updated_by, updated_at)  -- реквизиты оплаты и др.

admin_settings (key PK, value, updated_by, updated_at)
-- Ключи по умолчанию:
--   token_to_balance_rate  = '10'   (1 GOST-токен = 10 ₽)
--   balance_to_token_rate  = '0.1'  (1 ₽ = 0.1 GOST-токена)
--   deposit_commission_pct = '10'   (10% комиссия с пополнения)
--   referral_bonus_pct     = '5'    (5% реферальный бонус)
--   referral_max_count     = '3'    (бонус за первые 3 пополнения реферала)
--   referral_min_amount    = '100'  (минимум для реферального бонуса, ₽)
```

---

## 4. Backend API (Биржа)

**Runtime**: Node.js + Express.js, задеплоен на Render.com  
**Base URL**: `https://<render-app>.onrender.com` (уточнить актуальный URL)  
**Auth**: все защищённые эндпоинты требуют `Authorization: Bearer <supabase_jwt>` (токен из Supabase Auth)

### 4.1 Реализованные эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/settings` | Реквизиты оплаты (payment_requisites) |
| **Профиль** | | |
| GET | `/users/:id` | Публичный профиль пользователя |
| GET | `/users/:id/reviews` | Отзывы о пользователе |
| **Биржа — заказы** | | |
| GET | `/orders` | Лента открытых заказов (поиск: ?search=) |
| POST | `/orders` | Создать заказ (списывает balance) |
| GET | `/orders/mine` | Мои заказы (как заказчик) |
| GET | `/orders/applied` | Заказы, на которые откликнулся (как исполнитель) |
| GET | `/orders/pending-reviews` | Заказы, ожидающие отзыва |
| GET | `/orders/:id` | Детали заказа |
| POST | `/orders/:id/apply` | Откликнуться на заказ |
| GET | `/orders/:id/applications` | Отклики на заказ (только заказчик/admin) |
| POST | `/orders/:id/applications/:appId/select` | Выбрать исполнителя |
| POST | `/orders/:id/topup` | Доплатить при awaiting_topup |
| POST | `/orders/:id/cancel` | Отменить заказ (с возвратом) |
| POST | `/orders/:id/confirm` | Подтвердить выполнение |
| POST | `/orders/:id/dispute` | Открыть спор |
| GET | `/orders/:id/reviews` | Отзывы по заказу |
| POST | `/orders/:id/reviews` | Оставить отзыв |
| GET | `/orders/:id/conversation` | ID чата по заказу |
| POST | `/orders/:id/attachments` | Загрузить вложение |
| GET | `/orders/:id/attachments/:aid/download` | Ссылка на скачивание |
| **Биржа — объявления** | | |
| POST | `/listings` | Создать объявление (исполнитель) |
| GET | `/listings` | Лента объявлений |
| GET | `/listings/mine` | Мои объявления |
| GET | `/listings/:id` | Детали объявления |
| PATCH | `/listings/:id` | Обновить объявление |
| DELETE | `/listings/:id` | Удалить объявление |
| POST | `/listings/:id/order` | Создать заказ из объявления |
| **Чат** | | |
| GET | `/conversations/:id` | Сообщения чата (с пагинацией) |
| POST | `/conversations/:id/messages` | Отправить сообщение |
| POST | `/conversations/:id/messages/:mid/attachments` | Прикрепить файл |
| GET | `/conversations/:id/messages/:mid/attachments/:aid` | Скачать файл из чата |
| **Кошелёк** | | |
| GET | `/wallet` | Баланс + реферальная программа + последние операции |
| POST | `/wallet/deposits` | Создать заявку на пополнение |
| GET | `/wallet/deposits` | История пополнений |
| POST | `/wallet/withdrawals` | Заявка на вывод (сразу резервирует баланс) |
| GET | `/wallet/withdrawals` | История выводов |
| **Поддержка** | | |
| POST | `/support/tickets` | Создать тикет |
| GET | `/support/tickets` | Мои тикеты |
| GET | `/support/tickets/:id` | Детали тикета + переписка |
| POST | `/support/tickets/:id/messages` | Ответить в тикете |
| **Админ** (is_admin = true) | | |
| GET | `/admin/stats` | Общая статистика |
| GET/PATCH | `/admin/users` | Список пользователей, бан/анбан/admin |
| GET/POST | `/admin/deposits/:id/confirm\|reject` | Управление пополнениями |
| GET/POST | `/admin/withdrawals/:id/confirm\|reject` | Управление выводами |
| GET | `/admin/orders` | Все заказы |
| GET | `/admin/conversations` | Все чаты |
| GET | `/admin/ledger` | Журнал транзакций |
| GET/POST | `/admin/disputes/:id/resolve` | Разрешение споров |
| GET/PATCH | `/admin/chat-moderation` | Модерация сообщений |
| GET | `/admin/contact-exchange-orders` | Сделки с обменом контактов |
| GET/PATCH | `/admin/support/tickets/:id/close` | Тикеты поддержки |
| PUT | `/admin/settings/:key` | Обновить настройку |

### 4.2 Планируемые эндпоинты (не реализованы)

| Метод | Путь | Описание |
|---|---|---|
| GET/PUT | `/profile` | Свой профиль (чтение + обновление nickname/avatar/full_name/etc.) |
| POST | `/profile/avatar` | Загрузка аватара |
| GET | `/gost/tokens` | Баланс ГОСТ-токенов текущего пользователя |
| POST | `/gost/convert` | Конвертация рублей → ГОСТ-токены |
| GET | `/forum/topics` | Темы форума |
| POST | `/forum/topics` | Создать тему |
| GET | `/forum/topics/:id/posts` | Посты темы |
| POST | `/forum/topics/:id/posts` | Ответить в теме |

---

## 5. Бизнес-логика (ключевые числа)

| Параметр | Значение |
|---|---|
| Комиссия с пополнения | 10% (пользователь получает 90% от суммы) |
| Реферальный бонус | 5% от суммы пополнения, за первые 3 пополнения ≥100 ₽ |
| Автоподтверждение заказа | 24 часа после первого confirm |
| Rate limit пополнений | 3 заявки в час на пользователя |
| Конвертация баланс → ГОСТ токен | 1 ₽ = 0.1 токена (настраивается в admin_settings) |
| Комиссия на заказ | 0% (1:1 перевод исполнителю) |

---

## 6. Модерация форума

**Регулярными выражениями (блокируется сразу)**:
- Экстремизм, нацистская и геноцидная риторика (набор ключевых слов)
- Явная реклама конкурирующих/сторонних сервисов

**AI постфактум (DeepSeek, после отправки)**:
- Глубокий контекстный анализ; подозрительные сообщения помечаются флагом `ai_suspected`
- Спам/флуд (повторяющиеся идентичные сообщения)

**НЕ модерируется** (явно): обмен контактами между участниками сделки, мат.

**Логируется в**: `chat_moderation_log` (reason: extremism | advertising | spam)

---

## 7. Дизайн-система

| Элемент | Значение |
|---|---|
| Цвет акцента (primary) | `#14a89a` (teal) |
| Hover акцента | `#0e8a7d` (dark teal) |
| Фон страницы | `#1a2332` (dark navy) |
| Фон карточек | `#1e2a3a` / `#243044` |
| Текст | `#e2e8f0` (light) / `#94a3b8` (muted) |
| Иконки | [Lucide React](https://lucide.dev) |
| Стиль | Минималистичный, тёмная тема, без лишних декораций |
| Шрифт | Системный (Inter если подключить) |

**Пример CSS-переменных**:
```css
--color-bg:       #1a2332;
--color-card:     #1e2a3a;
--color-card-2:   #243044;
--color-primary:  #14a89a;
--color-primary-h:#0e8a7d;
--color-text:     #e2e8f0;
--color-muted:    #94a3b8;
--color-border:   #2d3f55;
```

---

## 8. Roadmap

| Этап | Описание | Статус |
|---|---|---|
| **0 — БД** | Единая схема в TARGET Supabase (ГОСТ-проект), миграции применены | ✅ Завершён |
| **1 — Каркас сайта** | Layout с навигацией (Биржа / Форум / ГОСТ / Профиль / Кошелёк), Auth flow (register/login с reф. кодом) | ✅ Завершён |
| **2 — Перенос Биржи** | Перенос UI биржи из старого репо (orders, listings, wallet, admin-панель) | ✅ Завершён |
| **3 — Форум** | Темы, посты, реакции, модерация, субфорумы по предметам | ✅ Завершён |
| **4 — Интеграция ГОСТ** | Страница ГОСТ-калькулятора, конвертация рублей → токены | ✅ Завершён |
| **5 — Единый кошелёк** | Страница "Кошелёк": рублёвый баланс + ГОСТ-токены на одном экране | ✅ Завершён |
| **6 — Брендинг** | Логотип, мобильная навигация, деплой на GitHub Pages | ✅ Завершён |

---

## 9. Полезные ссылки

- Supabase Dashboard: https://supabase.com/dashboard/project/btcpbvevytmhgkevhnyj
- Backend репо: `ks1rex/reshbirga` (Node.js + Express)
- Lucide icons: https://lucide.dev/icons
- Supabase JS SDK: `@supabase/supabase-js`
