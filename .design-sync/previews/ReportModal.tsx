import { ReportModal } from 'ebu-gubkin'

export function Default() {
  return (
    <div style={{ minHeight: 700 }}>
      <ReportModal postId="preview-post" token="preview-token" onClose={() => {}} />
    </div>
  )
}
