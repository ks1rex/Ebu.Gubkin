import { CreateThreadModal } from 'ebu-gubkin'

export function Default() {
  return (
    <div style={{ minHeight: 700 }}>
      <CreateThreadModal
        token="preview-token"
        prefillCategoryId="general"
        prefillCategoryName="Общее"
        onClose={() => {}}
      />
    </div>
  )
}
