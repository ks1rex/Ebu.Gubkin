import { BuyTokensModal } from 'ebu-gubkin'

export function Default() {
  return (
    <div style={{ minHeight: 700 }}>
      <BuyTokensModal
        walletBalance={1500}
        tokenPrice={10}
        token="preview-token"
        onClose={() => {}}
        onSuccess={() => {}}
      />
    </div>
  )
}
