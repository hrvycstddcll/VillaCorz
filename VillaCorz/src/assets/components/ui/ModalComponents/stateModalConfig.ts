const cancelledMascot = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364330/villacorz/ui/src/assets/mascots/cancelled.png'
const choosingMascot = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364334/villacorz/ui/src/assets/mascots/choosing.png'
const emptyMascot = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364314/villacorz/ui/src/assets/mascots/Empty.png'
const errorMascot = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364326/villacorz/ui/src/assets/mascots/PaymentUnsuccessful.png'
const interruptedMascot = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364318/villacorz/ui/src/assets/mascots/Interrupted_Error.png'
const successMascot = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364322/villacorz/ui/src/assets/mascots/PaymentConfirmation.png'
const somethingWentWrongMascot = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364337/villacorz/ui/src/assets/mascots/somethingwentwrong.png'

export type StateKind =
    | 'cancelled'
    | 'choosing'
    | 'empty'
    | 'error'
    | 'interrupted'
    | 'success'
    | 'somethingWentWrong'

export const stateMascots: Record<StateKind, string> = {
    cancelled: cancelledMascot,
    choosing: choosingMascot,
    empty: emptyMascot,
    error: errorMascot,
    interrupted: interruptedMascot,
    success: successMascot,
    somethingWentWrong: somethingWentWrongMascot,
}
