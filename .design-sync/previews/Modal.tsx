import { Modal } from 'ebu-gubkin'

export function Default() {
  return (
    // minHeight: the wrapping single-card frame has no in-flow content of its
    // own, so a `fixed inset-0` modal's containing block collapses to 0
    // height and the centered content clips. This div gives it real height.
    <div style={{ minHeight: 700 }}>
      <Modal open onClose={() => {}} title="Подтвердите действие">
        <p style={{ color: '#94a3b8' }}>Вы уверены, что хотите выполнить это действие? Его нельзя будет отменить.</p>
      </Modal>
    </div>
  )
}

export function Wide() {
  return (
    <div style={{ minHeight: 700 }}>
      <Modal open onClose={() => {}} title="Детали заказа" maxWidth="max-w-2xl">
        <p style={{ color: '#94a3b8' }}>Более широкое модальное окно для подробного содержимого, например деталей заказа или формы.</p>
      </Modal>
    </div>
  )
}
