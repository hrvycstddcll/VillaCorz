import { Plus } from 'lucide-react'

type AddOfferCardProps = {
    onClick: () => void
    fullWidth?: boolean
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const AddOfferCard = ({ onClick, fullWidth = false }: AddOfferCardProps) => (
    <button
        type="button"
        onClick={onClick}
        aria-label="Add a new offer"
        className={`group flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 p-6 text-center transition duration-200 hover:border-[#006dfc] hover:bg-[#006dfc]/5 ${focusRing} ${
            fullWidth ? 'sm:col-span-2 xl:col-span-3' : ''
        }`}
    >
        <span className="grid size-14 place-items-center rounded-full bg-[#006dfc]/10 text-[#006dfc] transition duration-200 group-hover:scale-105 group-hover:bg-[#006dfc] group-hover:text-white">
            <Plus className="size-7" aria-hidden="true" />
        </span>
        <span>
            <span className="block font-serif text-xl font-bold text-[#003079]">
                Add Offer
            </span>
            <span className="mt-1 block text-sm text-slate-500">
                Create a new service for your guests.
            </span>
        </span>
    </button>
)

export default AddOfferCard
