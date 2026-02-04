import { getBezierPath } from 'reactflow';

export default function FloatingConnectionLine({
    fromX,
    fromY,
    toX,
    toY,
    fromPosition,
    toPosition,
    connectionLineStyle,
}: any) {
    const [edgePath] = getBezierPath({
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toX,
        targetY: toY,
        targetPosition: toPosition,
    });

    return (
        <g>
            <path
                fill="none"
                stroke="#3b82f6"
                strokeWidth={3}
                className="animated shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                d={edgePath}
                style={connectionLineStyle}
            />
            <circle
                cx={toX}
                cy={toY}
                fill="black"
                r={4}
                stroke="#3b82f6"
                strokeWidth={2}
            />
        </g>
    );
}
