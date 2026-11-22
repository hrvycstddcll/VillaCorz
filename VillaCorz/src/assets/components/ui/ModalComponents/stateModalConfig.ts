import cancelledMascot from '../../../mascots/cancelled.png'
import choosingMascot from '../../../mascots/choosing.png'
import emptyMascot from '../../../mascots/Empty.png'
import errorMascot from '../../../mascots/PaymentUnsuccessful.png'
import interruptedMascot from '../../../mascots/Interrupted_Error.png'
import successMascot from '../../../mascots/PaymentConfirmation.png'
import somethingWentWrongMascot from '../../../mascots/somethingwentwrong.png'

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
