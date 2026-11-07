import { useRef, useState } from 'react'
import {
    ChevronLeft,
    ChevronRight,
    ImagePlus,
    Star,
    Trash2,
} from 'lucide-react'
import type { ServiceImage } from '../../../services/types'

export const MAX_OFFER_IMAGES = 10
export const MAX_OFFER_IMAGE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type ManagedOfferImage = {
    key: string
    kind: 'existing' | 'new'
    previewUrl: string
    file?: File
    image?: ServiceImage
}

type OfferImageManagerProps = {
    images: ManagedOfferImage[]
    primaryKey: string | null
    onChange: (images: ManagedOfferImage[]) => void
    onPrimaryChange: (key: string) => void
    disabled?: boolean
    error?: string
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const createImageKey = () =>
    `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const OfferImageManager = ({
    images,
    primaryKey,
    onChange,
    onPrimaryChange,
    disabled = false,
    error,
}: OfferImageManagerProps) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [fileError, setFileError] = useState('')

    const addFiles = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return

        setFileError('')

        const selected = Array.from(fileList)
        const availableSlots = MAX_OFFER_IMAGES - images.length

        if (selected.length > availableSlots) {
            setFileError(
                availableSlots <= 0
                    ? `You can add up to ${MAX_OFFER_IMAGES} images.`
                    : `You can only add ${availableSlots} more image${availableSlots === 1 ? '' : 's'}.`,
            )
            return
        }

        const invalidType = selected.find(
            (file) => !ACCEPTED_IMAGE_TYPES.includes(file.type),
        )

        if (invalidType) {
            setFileError('Images must be JPG, PNG, or WebP files.')
            return
        }

        const oversized = selected.find(
            (file) => file.size > MAX_OFFER_IMAGE_SIZE,
        )

        if (oversized) {
            setFileError('Each image must be 5 MB or smaller.')
            return
        }

        const newImages: ManagedOfferImage[] = selected.map((file) => ({
            key: createImageKey(),
            kind: 'new',
            file,
            previewUrl: URL.createObjectURL(file),
        }))

        const nextImages = [...images, ...newImages]
        onChange(nextImages)

        if (!primaryKey && nextImages[0]) {
            onPrimaryChange(nextImages[0].key)
        }
    }

    const moveImage = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction

        if (targetIndex < 0 || targetIndex >= images.length) return

        const nextImages = [...images]
        const [moved] = nextImages.splice(index, 1)
        nextImages.splice(targetIndex, 0, moved)
        onChange(nextImages)
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-700">
                        Service images
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Add up to {MAX_OFFER_IMAGES} images. Choose one as the
                        primary image.
                    </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {images.length} / {MAX_OFFER_IMAGES}
                </span>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={disabled}
                className="sr-only"
                onChange={(event) => {
                    addFiles(event.target.files)
                    event.target.value = ''
                }}
            />

            <div className="mt-3 flex flex-wrap gap-3">
                <button
                    type="button"
                    disabled={disabled || images.length >= MAX_OFFER_IMAGES}
                    onClick={() => inputRef.current?.click()}
                    className={`inline-flex min-h-24 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-sm font-medium text-slate-600 transition hover:border-[#006dfc] hover:bg-[#006dfc]/5 hover:text-[#006dfc] disabled:cursor-not-allowed disabled:opacity-50 sm:w-48 ${focusRing}`}
                >
                    <ImagePlus className="size-5" aria-hidden="true" />
                    Add images
                </button>

                {images.map((image, index) => {
                    const isPrimary = image.key === primaryKey

                    return (
                        <div
                            key={image.key}
                            className={`group relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-slate-100 sm:w-48 ${
                                isPrimary
                                    ? 'border-[#006dfc] ring-2 ring-[#006dfc]/20'
                                    : 'border-slate-200'
                            }`}
                        >
                            <img
                                src={image.previewUrl}
                                alt={`Offer image ${index + 1}`}
                                className="h-full w-full object-cover"
                            />

                            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-slate-950/60 to-transparent p-2">
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onPrimaryChange(image.key)}
                                    aria-label={
                                        isPrimary
                                            ? 'Primary image'
                                            : `Set image ${index + 1} as primary`
                                    }
                                    aria-pressed={isPrimary}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm transition ${focusRing} ${
                                        isPrimary
                                            ? 'bg-white text-[#006dfc]'
                                            : 'bg-white/90 text-slate-600 hover:text-[#006dfc]'
                                    }`}
                                >
                                    <Star
                                        className={`size-3 ${isPrimary ? 'fill-[#006dfc]' : ''}`}
                                        aria-hidden="true"
                                    />
                                    {isPrimary ? 'Primary' : 'Set primary'}
                                </button>

                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => {
                                        setFileError('')

                                        if (image.kind === 'new') {
                                            URL.revokeObjectURL(image.previewUrl)
                                        }

                                        const nextImages = images.filter(
                                            (item) => item.key !== image.key,
                                        )

                                        onChange(nextImages)

                                        if (isPrimary && nextImages[0]) {
                                            onPrimaryChange(nextImages[0].key)
                                        }
                                    }}
                                    aria-label={`Remove image ${index + 1}`}
                                    className={`inline-grid size-6 place-items-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:bg-white hover:text-rose-600 ${focusRing}`}
                                >
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/60 to-transparent p-2">
                                <button
                                    type="button"
                                    disabled={disabled || index === 0}
                                    onClick={() => moveImage(index, -1)}
                                    aria-label={`Move image ${index + 1} earlier`}
                                    className={`inline-grid size-7 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                                >
                                    <ChevronLeft className="size-4" aria-hidden="true" />
                                </button>
                                <span className="text-[10px] font-medium text-white">
                                    {image.kind === 'existing'
                                        ? 'Saved'
                                        : 'New'}
                                </span>
                                <button
                                    type="button"
                                    disabled={disabled || index === images.length - 1}
                                    onClick={() => moveImage(index, 1)}
                                    aria-label={`Move image ${index + 1} later`}
                                    className={`inline-grid size-7 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                                >
                                    <ChevronRight className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {(fileError || error) && (
                <p role="alert" className="mt-2 text-xs text-rose-600">
                    {fileError || error}
                </p>
            )}

            <p className="mt-2 text-[11px] text-slate-500">
                JPG, PNG or WebP. Maximum 5 MB per image. Removed or replaced
                images are cleaned up from Cloudinary when you save.
            </p>
        </div>
    )
}

export default OfferImageManager
