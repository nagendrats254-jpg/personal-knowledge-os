import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { graphApi } from '../../api/pkosApi';
import { usePKOSStore } from '../../store/useStore';
import type { GraphData, GraphNode, GraphEdge } from '../../types';
import { Share2, RefreshCw, Info, X } from 'lucide-react';

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { setActiveNoteId, setActiveView } = usePKOSStore();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphApi.get();
      setGraphData(data);
    } catch {
      setError('Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  useEffect(() => {
    if (!graphData || !svgRef.current) return;
    const { nodes, edges } = graphData;
    if (nodes.length === 0) return;

    const container = svgRef.current.parentElement!;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    // ── Zoom & Pan ────────────────────────────────────────────────────────
    const g = svg.append('g');
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // ── Deep-clone nodes for D3 simulation ────────────────────────────────
    const simNodes = nodes.map((n) => ({ ...n })) as GraphNode[];
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simEdges = edges
      .map((e) => ({
        source: nodeMap.get(typeof e.source === 'string' ? e.source : e.source.id)!,
        target: nodeMap.get(typeof e.target === 'string' ? e.target : e.target.id)!,
      }))
      .filter((e) => e.source && e.target) as d3.SimulationLinkDatum<GraphNode>[];

    // ── Force Simulation ──────────────────────────────────────────────────
    const simulation = d3
      .forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id((d) => (d as GraphNode).id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(40));

    // ── Edges ─────────────────────────────────────────────────────────────
    const link = g
      .append('g')
      .selectAll('line')
      .data(simEdges)
      .enter()
      .append('line')
      .attr('class', 'graph-link')
      .attr('stroke-opacity', 0.5);

    // ── Color scale by tags ───────────────────────────────────────────────
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    // ── Nodes ─────────────────────────────────────────────────────────────
    const node = g
      .append('g')
      .selectAll('.graph-node')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', 'graph-node')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_event, d) => {
        setSelectedNode(d);
      });

    // Node circles — size by link count
    node
      .append('circle')
      .attr('r', (d) => Math.max(10, 10 + d.linkCount * 3))
      .attr('fill', (d) => colorScale(d.tags[0] ?? 'default'))
      .attr('fill-opacity', 0.85)
      .attr('stroke', (d) => colorScale(d.tags[0] ?? 'default'))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4);

    // Node labels
    node
      .append('text')
      .text((d) => d.title.length > 18 ? d.title.slice(0, 16) + '…' : d.title)
      .attr('dy', (d) => Math.max(10, 10 + d.linkCount * 3) + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#94a3b8');

    // ── Tick ─────────────────────────────────────────────────────────────
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [graphData]);

  const handleOpenNote = () => {
    if (!selectedNode) return;
    setActiveNoteId(selectedNode.id);
    setActiveView('notes');
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button onClick={fetchGraph} className="btn-ghost glass-card px-3 py-2" title="Refresh graph">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 glass-card px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-aurora-400" />
        Drag nodes · Scroll to zoom · Click to select
      </div>

      {/* Graph */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-aurora-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-500">Building knowledge graph…</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : graphData && graphData.nodes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Share2 className="w-16 h-16 text-slate-700" />
          <div className="text-center">
            <p className="text-slate-400 font-medium">No connections yet</p>
            <p className="text-slate-600 text-sm mt-1">
              Use <code className="text-aurora-400">[[Note Title]]</code> in your notes to create links
            </p>
          </div>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-full" />
      )}

      {/* Selected node panel */}
      {selectedNode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-card px-5 py-3 flex items-center gap-4 animate-fade-in shadow-aurora">
          <div>
            <p className="text-sm font-semibold text-white">{selectedNode.title}</p>
            <p className="text-xs text-slate-500">
              {selectedNode.linkCount} connection{selectedNode.linkCount !== 1 ? 's' : ''}
              {selectedNode.tags.length > 0 && ` · ${selectedNode.tags.join(', ')}`}
            </p>
          </div>
          <button onClick={handleOpenNote} className="btn-primary text-xs py-1.5 px-3">
            Open Note
          </button>
          <button onClick={() => setSelectedNode(null)} className="btn-ghost text-xs py-1.5 px-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
