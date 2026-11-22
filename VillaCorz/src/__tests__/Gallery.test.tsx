import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Gallery from '../assets/components/pages/Gallery'
import { loadGalleryImages } from '../services/galleryService'
import type { GalleryItem } from '../services/types'

vi.mock('../services/galleryService', () => ({
    loadGalleryImages: vi.fn(),
}))

vi.mock('../assets/components/ui/CssComponents/DriftWall', () => ({
    default: ({
        items,
        onSelect,
    }: {
        items: GalleryItem[]
        onSelect?: (item: GalleryItem, index: number) => void
    }) => (
        <div data-testid="drift-wall">
            {items.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    aria-label={`Open photo: ${item.title}`}
                    onClick={() => onSelect?.(item, index)}
                >
                    <img src={item.image} alt={item.title} />
                </button>
            ))}
        </div>
    ),
}))

const items: GalleryItem[] = [
    {
        id: '1-1',
        image: 'https://cdn.test/one.jpg',
        title: 'Ocean Suite',
        quote: 'A calm and beautiful stay.',
        author: 'Maya',
        serviceName: 'Room 1',
        rating: 5,
        createdAt: '2026-11-10T00:00:00.000Z',
    },
    {
        id: '2-2',
        image: 'https://cdn.test/two.jpg',
        title: 'Garden Villa',
        quote: 'Perfect for our family.',
        author: 'Noel',
        serviceName: 'Room 2',
        rating: 5,
        createdAt: '2026-11-01T00:00:00.000Z',
    },
]

describe('Gallery', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(loadGalleryImages).mockResolvedValue(items)
    })

    it('renders real review images and opens a full-screen lightbox', async () => {
        render(<Gallery />)

        expect(await screen.findByTestId('drift-wall')).toBeInTheDocument()
        expect(screen.getAllByRole('img')).toHaveLength(2)

        fireEvent.click(screen.getByRole('button', { name: /open photo: ocean suite/i }))

        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        expect(screen.getByText(/A calm and beautiful stay/)).toBeInTheDocument()
        expect(screen.getByText('Maya')).toBeInTheDocument()
    })

    it('navigates with lightbox controls and closes with Escape', async () => {
        render(<Gallery />)
        await screen.findByTestId('drift-wall')

        fireEvent.click(screen.getByRole('button', { name: /open photo: ocean suite/i }))
        fireEvent.click(screen.getByRole('button', { name: /next photo/i }))

        expect(screen.getByText(/Perfect for our family/)).toBeInTheDocument()
        expect(screen.getByText('Noel')).toBeInTheDocument()

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
})
