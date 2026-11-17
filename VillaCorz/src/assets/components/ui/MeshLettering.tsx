import React from 'react'

type MeshLetteringProps = {
    text?: string
}

const MeshLettering = ({ text = 'VillaCorz' }: MeshLetteringProps) => {
    return <span>{text}</span>
}

export default MeshLettering