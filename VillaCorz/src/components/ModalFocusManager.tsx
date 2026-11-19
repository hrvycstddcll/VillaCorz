import { useEffect } from 'react'
import { pauseSmoothScroll, resumeSmoothScroll } from '../lib/smoothScroll'

const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]'
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
].join(',')

const getDialog = () => {
    const dialogs = Array.from(
        document.querySelectorAll<HTMLElement>(MODAL_SELECTOR),
    ).filter(
        (dialog) =>
            !dialog.hasAttribute('hidden') &&
            dialog.getAttribute('aria-hidden') !== 'true',
    )

    return dialogs.length ? dialogs[dialogs.length - 1] : null
}

const isHidden = (element: HTMLElement) =>
    element.closest('[hidden], [aria-hidden="true"], [inert]') !== null

const getFocusable = (dialog: HTMLElement) =>
    Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !isHidden(element),
    )

const allowModalScroll = (dialog: HTMLElement) => {
    const candidates = [
        dialog,
        ...Array.from(dialog.querySelectorAll<HTMLElement>('*')),
    ]

    candidates.forEach((element) => {
        const overflowY = window.getComputedStyle(element).overflowY
        if (overflowY === 'auto' || overflowY === 'scroll') {
            element.setAttribute('data-lenis-prevent', '')
        }
    })
}

function ModalFocusManager() {
    useEffect(() => {
        let dialog: HTMLElement | null = null
        let trigger: HTMLElement | null = null

        const focusDialog = (element: HTMLElement) => {
            const focusable = getFocusable(element)

            if (focusable.length) {
                focusable[0].focus({ preventScroll: true })
                return
            }

            if (!element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '-1')
            }
            element.focus({ preventScroll: true })
        }

        const sync = () => {
            const nextDialog = getDialog()

            if (!nextDialog) {
                if (dialog) {
                    document.documentElement.classList.remove('modal-open')
                    resumeSmoothScroll()
                    if (trigger && document.contains(trigger)) {
                        trigger.focus({ preventScroll: true })
                    }
                }
                dialog = null
                trigger = null
                return
            }

            if (!dialog) {
                const activeElement = document.activeElement
                trigger =
                    activeElement instanceof HTMLElement ? activeElement : null
                document.documentElement.classList.add('modal-open')
                pauseSmoothScroll()
            }

            const isNewDialog = dialog !== nextDialog
            dialog = nextDialog

            if (isNewDialog) allowModalScroll(dialog)

            if (!dialog.contains(document.activeElement)) {
                focusDialog(dialog)
            }
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || !dialog) return

            const focusable = getFocusable(dialog)

            if (!focusable.length) {
                event.preventDefault()
                if (!dialog.hasAttribute('tabindex')) {
                    dialog.setAttribute('tabindex', '-1')
                }
                dialog.focus({ preventScroll: true })
                return
            }

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            const activeElement = document.activeElement

            if (!dialog.contains(activeElement)) {
                event.preventDefault()
                first.focus({ preventScroll: true })
                return
            }

            if (event.shiftKey && activeElement === first) {
                event.preventDefault()
                last.focus({ preventScroll: true })
            } else if (!event.shiftKey && activeElement === last) {
                event.preventDefault()
                first.focus({ preventScroll: true })
            }
        }

        const observer = new MutationObserver(sync)
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-modal', 'role', 'hidden', 'aria-hidden'],
        })
        document.addEventListener('keydown', handleKeyDown, true)

        sync()

        return () => {
            observer.disconnect()
            document.removeEventListener('keydown', handleKeyDown, true)
            document.documentElement.classList.remove('modal-open')
            resumeSmoothScroll()
        }
    }, [])

    return null
}

export default ModalFocusManager
