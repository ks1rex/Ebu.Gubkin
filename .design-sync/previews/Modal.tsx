import { Modal } from 'ebu-gubkin'

export function Default() {
  return (
    <Modal open onClose={() => {}} title="Подтвердите действие">
      <p style={{ color: '#94a3b8' }}>Вы уверены, что хотите выполнить это действие? Его нельзя будет отменить.</p>
    </Modal>
  )
}

export function Wide() {
  return (
    <Modal open onClose={() => {}} title="Детали заказа" maxWidth="max-w-2xl">
      <p style={{ color: '#94a3b8' }}>Более широкое модальное окно для подробного содержимого, например деталей заказа или формы.</p>
    </Modal>
  )
}
