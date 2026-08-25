// Полный список типов из transaction_type (Postgres enum). Раньше в Wallet.tsx
// не было vip_purchase, balance_to_token, deposit_referral, order_refund_excess
// и dispute_refund_full — они показывались сырым английским ключом транзакции.
export const TX_LABELS: Record<string, string> = {
  deposit:                 'Пополнение',
  deposit_referral:        'Пополнение (реферальное)',
  withdrawal:              'Вывод',
  order_payment:           'Оплата заказа',
  order_cancel_refund:     'Возврат (отмена)',
  order_refund_excess:     'Возврат излишка',
  order_topup:             'Доплата по заказу',
  order_payout:            'Выплата исполнителю',
  dispute_refund_customer: 'Возврат (спор)',
  dispute_refund_full:     'Возврат (спор, полный)',
  deposit_hold:            'Заморозка',
  deposit_release:         'Разморозка',
  deposit_forfeit:         'Конфискация',
  referral_bonus:          'Реферальный бонус',
  vip_purchase:            'Покупка VIP',
  balance_to_token:        'Покупка ГОСТ-токенов',
}

// deposit_referral — это зачисление на баланс (реферальное пополнение), а не
// списание.
export const INCOME_TYPES = new Set([
  'deposit', 'deposit_referral', 'order_payout', 'dispute_refund_customer',
  'dispute_refund_full', 'deposit_release', 'order_cancel_refund',
  'order_refund_excess', 'referral_bonus',
])
