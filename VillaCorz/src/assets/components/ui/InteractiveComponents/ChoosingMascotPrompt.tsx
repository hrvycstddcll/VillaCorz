import { stateMascots } from '../ModalComponents/stateModalConfig'

type ChoosingMascotPromptProps = {
    onChooseRoom: () => void
    actionLabel?: string
    compact?: boolean
}

const ChoosingMascotPrompt = ({
    onChooseRoom,
    actionLabel = 'Choose a room',
    compact = false,
}: ChoosingMascotPromptProps) => (
    <div
        className={`flex flex-col items-center text-center ${compact ? 'px-3 py-6' : 'px-4 py-8 sm:px-6'}`}
    >
        <div
            className={`flex shrink-0 items-center justify-center rounded-full bg-blue-50 ${compact ? 'size-24' : 'size-32'}`}
        >
            <img
                src={stateMascots.choosing}
                alt=""
                aria-hidden="true"
                className={`object-contain ${compact ? 'size-20' : 'size-28'}`}
            />
        </div>
        <h3 className="mt-3 font-jakarta text-sm font-semibold tracking-[-0.01em] text-slate-950 sm:text-base lg:text-lg">
            Choose a room first
        </h3>
        <p className="mt-1.5 max-w-xs font-poppins text-[13px] leading-relaxed text-slate-500 sm:text-sm lg:text-base">
            Pick a room from the list, then I’ll show only the dates available for
            that stay.
        </p>
        <button
            type="button"
            onClick={onChooseRoom}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#006dfc] px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(0,109,252,0.24)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] sm:text-sm lg:text-base"
        >
            {actionLabel}
        </button>
    </div>
)

export default ChoosingMascotPrompt
