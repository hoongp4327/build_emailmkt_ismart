import ileadOfferDoc from './ilead-offer.json'
import paymentNoticeDoc from './payment-notice.json'

export const TEMPLATES = [
  {
    id: 'payment-notice',
    name: 'Thông báo học phí & Chuyển khoản (HSK1)',
    badge: 'Mẫu chuyển khoản',
    desc: 'Banner, thông tin lớp học, học phí, mã QR và STK ngân hàng ACB',
    doc: paymentNoticeDoc,
  },
  {
    id: 'ilead-offer',
    name: 'Ưu đãi tuyển sinh & Đăng ký (iLEAD)',
    badge: 'Mẫu tuyển sinh',
    desc: 'Giới thiệu khóa học, bảng ưu đãi 3 cột và danh sách quà tặng',
    doc: ileadOfferDoc,
  },
]

export { ileadOfferDoc, paymentNoticeDoc }
