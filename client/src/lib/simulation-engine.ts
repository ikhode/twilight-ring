
import { Node, Edge } from "reactflow";

export interface SimulationStep {
    id: string;
    type: 'node_activation' | 'token_traversal' | 'log';
    nodeId?: string;
    edgeId?: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    timestamp: number;
    duration?: number; // ms
    message?: string;
    data?: any;
}

export interface SimulationResult {
    steps: SimulationStep[];
    success: boolean;
    logs: string[];
}

/**
 * Runs a client-side simulation of the workflow.
 * This is a deterministic traversal that mocks decision points.
 */
export function simulateWorkflow(nodes: Node[], edges: Edge[]): SimulationResult {
    const steps: SimulationStep[] = [];
    const logs: string[] = [];
    let currentTime = 0;

    // 1. Find Start Node
    // We assume 'trigger' type or the first node with no incoming edges (dagre rank 0)
    // For now, looking for type 'trigger' or 'start'
    const startNode = nodes.find(n => n.type === 'trigger' || n.type === 'start') || nodes[0];

    if (!startNode) {
        return { steps, success: false, logs: ["No start node found."] };
    }

    logs.push(`Starting simulation at ${startNode.data.label || startNode.id}`);

    // Queue for BFS/Traversal
    const queue: { node: Node, time: number }[] = [{ node: startNode, time: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
        // Sort queue by time to process in order
        queue.sort((a, b) => a.time - b.time);
        const { node, time } = queue.shift()!;
        currentTime = time;

        if (visited.has(node.id)) continue;
        visited.add(node.id);

        // Step 1: Activate Node
        steps.push({
            id: `activate-${node.id}-${currentTime}`,
            type: 'node_activation',
            nodeId: node.id,
            timestamp: currentTime,
            duration: 800, // Visual pause
            message: `Executing ${node.data.label}...`
        });

        // Step 2: Find Outgoing Edges
        const outgoingEdges = edges.filter(e => e.source === node.id);

        if (outgoingEdges.length === 0) {
            logs.push(`Workflow ended at ${node.data.label}`);
            continue;
        }

        // HEURISTIC: Handle Branching (Decision Nodes) or Split
        // If type is 'condition', we might randomly pick one path or simulate both?
        // For visual "wow", let's pick 1 random path if validation, or all if parallel.
        // Assuming 'condition' means exclusive OR (XOR) usually.

        let edgesToTraverse = outgoingEdges;
        if (node.type === 'condition' || node.type === 'decision') {
            // Randomly pick one for simulation demo
            // In a real generic engine, we'd evaluate logic.
            const randomEdge = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
            edgesToTraverse = [randomEdge];
            logs.push(`Decision: Taking path to ${randomEdge.target}`);
        }

        edgesToTraverse.forEach(edge => {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode) {
                // Step 3: Token Move
                steps.push({
                    id: `traverse-${edge.id}-${currentTime}`,
                    type: 'token_traversal',
                    edgeId: edge.id,
                    sourceNodeId: node.id,
                    targetNodeId: targetNode.id,
                    timestamp: currentTime + 800, // Start after activation
                    duration: 1500, // Travel time
                });

                queue.push({
                    node: targetNode,
                    time: currentTime + 800 + 1500
                });
            }
        });
    }

    return { steps, success: true, logs };
}
