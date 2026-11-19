import { useMemo, useState } from 'react'
import villaFrontSvg from '../../images/3dvillafront.svg?raw'
import villaSvg from '../../images/3dvilla.svg?raw'
import villaIcon from '../../images/villaicon.png'

const rooms = [
    { id: 1, title: 'Room #1', pax: 'GOOD FOR 2–4 PAX' },
    { id: 2, title: 'Room #2', pax: 'GOOD FOR 2–4 PAX' },
    { id: 3, title: 'Room #3', pax: 'GOOD FOR 2–4 PAX' },
    { id: 4, title: 'Room #4', pax: 'GOOD FOR 6–10 PAX' },
    { id: 5, title: 'Room #5', pax: 'GOOD FOR 6–10 PAX' },
]

const tooltipPositions: Record<number, { top: string; left: string }> = {
    5: { top: '34%', left: '38%' },
    4: { top: '38%', left: '12%' },
    1: { top: '22%', left: '44%' },
    2: { top: '20%', left: '60%' },
    3: { top: '38%', left: '74%' },
}

const BeachHouse = () => {
    const [activeRoom, setActiveRoom] = useState<number | null>(null)

    const animatedVillaSvg = useMemo(() => {
        return villaSvg
            .replace(/fill="#F7F4EA"/g, 'fill="#ECECEC"')
            .replace(/fill:rgb\(247, 244, 234\)/g, 'fill:rgb(236, 236, 236)')
            .replace(/translate\(301,199\)/g, 'translate(301,235)')
            .replace(
                /<g transform="translate\(405,222\) scale\(1\.1\)"/,
                '<g class="vc-guest vc-walker" transform="translate(405,222) scale(1.1)"',
            )
            .replace(
                /<g transform="([^"]*scale\(1\.1\)[^"]*)"/g,
                '<g class="vc-guest" transform="$1"',
            )
            .replace(/<g stroke="#3F8B66"/g, '<g class="vc-tree" stroke="#3F8B66"')
    }, [])

    return (
        <section
            id="beach-house"
            className="relative scroll-mt-24 overflow-hidden bg-white py-14 sm:py-18 lg:py-20"
        >
            <style>{`
                .vc-guest { animation: vc-bob 2.2s ease-in-out infinite; transform-origin: center bottom; }
                .vc-walker { animation: vc-walk 5s linear infinite; }
                .vc-tree { animation: vc-wind 3.5s ease-in-out infinite; transform-origin: center bottom; }
                @keyframes vc-bob { 0%,100% { translate: 0 0; } 50% { translate: 0 -4px; } }
                @keyframes vc-walk { 0% { translate: 0 0; } 50% { translate: 10px 5px; } 100% { translate: 0 0; } }
                @keyframes vc-wind { 0%,100% { rotate: -1.5deg; } 50% { rotate: 1.5deg; } }
            `}</style>
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                <div className="mb-8 mx-auto max-w-2xl text-center">
                    <h2 className="font-instrument text-4xl italic leading-tight tracking-tight text-black sm:text-5xl lg:text-6xl">
                        The Beach <span className="text-[#006dfc]">House</span>
                    </h2>
                    <p className="mt-4 font-poppins text-sm leading-relaxed text-slate-500 sm:text-base">
                        Villa Corz is a private beach house in Lian, Batangas, with 5 rooms.
                        Colorful, calm, and made for slow mornings on the veranda. Hover over
                        the map to take a look around.
                    </p>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row">
                    {/* Left container */}
                    <div className="flex w-full flex-col items-center gap-6 rounded-3xl bg-[#ECECEC] p-6 lg:w-[30%]">
                        <div
                            className="w-full max-w-[220px]"
                            dangerouslySetInnerHTML={{ __html: villaFrontSvg }}
                        />
                        <div className="flex w-full flex-col gap-3">
                            {rooms.map((room) => (
                                <button
                                    key={room.id}
                                    type="button"
                                    onClick={() =>
                                        setActiveRoom((prev) =>
                                            prev === room.id ? null : room.id,
                                        )
                                    }
                                    className="flex w-full items-center gap-3 rounded-full bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md"
                                >
                                    <span className="flex size-8 items-center justify-center rounded-full bg-white text-[#006dfc]">
                                        <img src={villaIcon} alt="" className="h-10 w-8 shrink-0" />
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="font-instrument text-[18px] italic text-black">
                                            {room.title}
                                        </span>
                                        <span className="font-helvetica-world text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            {room.pax}
                                        </span>
                                        <span className="font-helvetica-world text-[10px] text-[#006dfc]">
                                            with aircon
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right container */}
                    <div
                        className="relative w-full overflow-hidden rounded-3xl bg-[#ECECEC] p-4 lg:w-[70%]"
                    >
                        <div
                            className="relative mx-auto flex min-h-[640px] w-full items-center justify-center"
                            style={{
                                transformStyle: 'preserve-3d',
                            }}
                        >
                            <div
                                className="beach-house-map mt-12 w-full max-w-6xl"
                                dangerouslySetInnerHTML={{ __html: animatedVillaSvg }}
                            />
                            {rooms.map((room) => {
                                if (activeRoom !== room.id) return null
                                const pos = tooltipPositions[room.id]
                                return (
                                    <div
                                        key={room.id}
                                        className="absolute flex min-w-[150px] flex-col gap-1 rounded-2xl bg-white px-3 py-2 shadow-lg backdrop-blur transition"
                                        style={{
                                            top: pos.top,
                                            left: pos.left,
                                            transform: 'translateZ(20px)',
                                            transformStyle: 'preserve-3d',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 text-[#006dfc]">
                                            <img src={villaIcon} alt="" className="h-10 w-8 shrink-0" />
                                            <span className="font-instrument text-[18px] italic text-black">
                                                {room.title}
                                            </span>
                                        </div>
                                        <span className="font-helvetica-world text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            {room.pax}
                                        </span>
                                        <span className="font-helvetica-world text-[11px] text-[#006dfc]">
                                            with aircon
                                        </span>
                                        <span className="font-poppins text-[9px] text-slate-500">
                                            Inclusions: TV &amp; Private CR
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default BeachHouse