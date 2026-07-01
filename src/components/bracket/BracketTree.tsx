"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { seed } from "@/lib/data";
import {
  clampBracketZoom,
  getDisplayFitScale,
  getMaxZoom,
  resolveInitialBracketZoom,
} from "@/lib/bracket-viewport";
import { useSimulation } from "@/lib/store";
import { useStoreHydrated } from "@/lib/hooks";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  buildKnockoutTree,
  layoutBracketSubtree,
  getBracketCenterRow,
  type BracketTreeNode,
  type BracketLayoutSlot,
} from "@/lib/fifa/bracket-tree";
import type { ResolvedKnockoutMatch } from "@/lib/fifa/types";
import { BronzeMedalIcon, TrophyIcon } from "@/components/bracket/BracketIcons";
import { PodiumBoard } from "@/components/standings/PodiumBoard";
import { TeamBadge } from "@/components/ui/TeamBadge";

const ROW_HEIGHT = 112;
const MATCH_WIDTH = 240;
const CONNECTOR = 44;
const ROUND_WIDTH = MATCH_WIDTH + CONNECTOR;
const MATCH_HEIGHT = 64;
const FIT_PAD = 4;

const ZOOM_FACTOR = 1.1;
const DRAG_THRESHOLD = 5;
const MATCH_FOCUS_ZOOM = 1.75;
const READ_ONLY_FIT_SCALE = 0.94;

type Pan = { x: number; y: number };

type DragState = {
  pointerId: number;
  pending: boolean;
  active: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
};

type PointerRecord = { x: number; y: number };

type PinchState = {
  active: boolean;
  startDistance: number;
  startZoom: number;
  startPan: Pan;
  center: Pan;
};

const EMPTY_PINCH: PinchState = {
  active: false,
  startDistance: 0,
  startZoom: 1,
  startPan: { x: 0, y: 0 },
  center: { x: 0, y: 0 },
};

const EMPTY_DRAG: DragState = {
  pointerId: -1,
  pending: false,
  active: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
};

const READ_ONLY_INITIAL_PAN: Pan = { x: 0, y: 48 };

function pointerDistance(a: PointerRecord, b: PointerRecord) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerCenter(a: PointerRecord, b: PointerRecord, el: HTMLElement): Pan {
  return cursorFromEvent(el, (a.x + b.x) / 2, (a.y + b.y) / 2);
}

function zoomPanToCursor(
  cursor: Pan,
  pan: Pan,
  currentZoom: number,
  nextZoom: number,
  fitScale: number
): Pan {
  const currentScale = fitScale * currentZoom;
  const nextScale = fitScale * nextZoom;
  if (!currentScale || currentScale === nextScale) return pan;

  return {
    x: cursor.x - (nextScale / currentScale) * (cursor.x - pan.x),
    y: cursor.y - (nextScale / currentScale) * (cursor.y - pan.y),
  };
}

function cursorFromEvent(el: HTMLElement, clientX: number, clientY: number): Pan {
  const rect = el.getBoundingClientRect();
  return {
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  };
}

type Props = {
  matches: Map<number, ResolvedKnockoutMatch>;
  onPickWinner?: (matchNumber: number, teamId: string | null) => void;
};

function BracketMatchSlot({
  match,
  onPickWinner,
  onFocus,
  align = "left",
}: {
  match: ResolvedKnockoutMatch;
  onPickWinner?: (teamId: string | null) => void;
  onFocus?: (clientX: number, clientY: number) => void;
  align?: "left" | "right";
}) {
  const home = match.resolvedHome;
  const away = match.resolvedAway;
  const canPick = !!(onPickWinner && home?.team && away?.team);

  return (
    <div
      data-match-slot
      className={`select-none rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 shadow-sm ${
        align === "right" ? "text-right" : ""
      }`}
      style={{ width: MATCH_WIDTH, height: MATCH_HEIGHT }}
      title={`Trận #${match.matchNumber} · Double-click để phóng to`}
      onDoubleClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFocus?.(e.clientX, e.clientY);
      }}
    >
      <div className="flex h-full flex-col justify-center gap-1.5">
        <TeamBadge
          team={home?.team ?? null}
          label={home?.label}
          size="sm"
          align={align}
          selected={match.winner?.id === home?.team?.id}
          onClick={
            canPick && home?.team
              ? () =>
                  onPickWinner?.(match.winner?.id === home.team!.id ? null : home.team!.id)
              : undefined
          }
        />
        <TeamBadge
          team={away?.team ?? null}
          label={away?.label}
          size="sm"
          align={align}
          selected={match.winner?.id === away?.team?.id}
          onClick={
            canPick && away?.team
              ? () =>
                  onPickWinner?.(match.winner?.id === away.team!.id ? null : away.team!.id)
              : undefined
          }
        />
      </div>
    </div>
  );
}

function slotCenterY(slot: BracketLayoutSlot): number {
  return slot.row * ROW_HEIGHT + MATCH_HEIGHT / 2;
}

function columnX(side: "left" | "right", round: number, maxRound: number): number {
  if (side === "left") return round * ROUND_WIDTH;
  return (maxRound - round) * ROUND_WIDTH;
}

function connectorPaths(
  node: BracketTreeNode,
  slots: BracketLayoutSlot[],
  side: "left" | "right",
  maxRound: number
): string[] {
  if (!node.top || !node.bottom) return [];

  const slotMap = new Map(slots.map((slot) => [slot.matchNumber, slot]));
  const parent = slotMap.get(node.matchNumber);
  const topChild = slotMap.get(node.top.matchNumber);
  const bottomChild = slotMap.get(node.bottom.matchNumber);

  if (!parent || !topChild || !bottomChild) return [];

  const childRound = topChild.round;
  const parentRound = parent.round;
  const childCol = columnX(side, childRound, maxRound);
  const parentCol = columnX(side, parentRound, maxRound);

  const topY = slotCenterY(topChild);
  const bottomY = slotCenterY(bottomChild);
  const parentY = slotCenterY(parent);

  let paths: string[];
  if (side === "left") {
    const childRight = childCol + MATCH_WIDTH;
    const parentLeft = parentCol;
    const midX = childRight + CONNECTOR / 2;
    paths = [
      `M ${childRight} ${topY} H ${midX}`,
      `M ${childRight} ${bottomY} H ${midX}`,
      `M ${midX} ${topY} V ${bottomY}`,
      `M ${midX} ${parentY} H ${parentLeft}`,
    ];
  } else {
    const childLeft = childCol;
    const parentRight = parentCol + MATCH_WIDTH;
    const midX = childLeft - CONNECTOR / 2;
    paths = [
      `M ${childLeft} ${topY} H ${midX}`,
      `M ${childLeft} ${bottomY} H ${midX}`,
      `M ${midX} ${topY} V ${bottomY}`,
      `M ${midX} ${parentY} H ${parentRight}`,
    ];
  }

  return [
    ...paths,
    ...connectorPaths(node.top, slots, side, maxRound),
    ...connectorPaths(node.bottom, slots, side, maxRound),
  ];
}

function BracketHalf({
  root,
  side,
  matches,
  onPickWinner,
  onFocusMatch,
}: {
  root: BracketTreeNode;
  side: "left" | "right";
  matches: Map<number, ResolvedKnockoutMatch>;
  onPickWinner?: (matchNumber: number, teamId: string | null) => void;
  onFocusMatch: (clientX: number, clientY: number) => void;
}) {
  const layout = useMemo(() => layoutBracketSubtree(root), [root]);
  const maxRound = Math.max(...layout.slots.map((slot) => slot.round));
  const maxRow = Math.max(...layout.slots.map((slot) => slot.row));
  const height = (maxRow + 1) * ROW_HEIGHT;
  const width = (maxRound + 1) * ROUND_WIDTH - CONNECTOR;
  const paths = useMemo(
    () => connectorPaths(root, layout.slots, side, maxRound),
    [root, layout.slots, side, maxRound]
  );

  return (
    <div className="relative shrink-0" style={{ width, height }}>
      <svg
        className="absolute inset-0 pointer-events-none text-zinc-500"
        width={width}
        height={height}
        aria-hidden
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {layout.slots.map((slot) => {
        const match = matches.get(slot.matchNumber);
        if (!match) return null;
        return (
          <div
            key={slot.matchNumber}
            className="absolute z-10"
            style={{
              left: columnX(side, slot.round, maxRound),
              top: slot.row * ROW_HEIGHT,
            }}
          >
            <BracketMatchSlot
              match={match}
              align={side === "right" ? "right" : "left"}
              onPickWinner={(teamId) => onPickWinner?.(slot.matchNumber, teamId)}
              onFocus={onFocusMatch}
            />
          </div>
        );
      })}
    </div>
  );
}

const CENTER_LABEL_H = 18;
const HALF_GAP = 12;
const PODIUM_ABOVE = 108;
/** Khoảng cách (theo ROW_HEIGHT) từ chung kết xuống trận hạng 3 */
const THIRD_PLACE_ROW_GAP = 2;

function thirdPlaceTop(centerRow: number) {
  return PODIUM_ABOVE + (centerRow + THIRD_PLACE_ROW_GAP) * ROW_HEIGHT;
}

function centerColumnHeight(centerRow: number) {
  return PODIUM_ABOVE + (centerRow + THIRD_PLACE_ROW_GAP + 2) * ROW_HEIGHT;
}

function centerConnectorPaths(
  leftSlots: BracketLayoutSlot[],
  rightSlots: BracketLayoutSlot[],
  centerRow: number
): string[] {
  const halfW = 4 * ROUND_WIDTH - CONNECTOR;
  const centerW = MATCH_WIDTH + 24;
  const rightHalfX = halfW + HALF_GAP + centerW + HALF_GAP;

  const sf101 = leftSlots.find((slot) => slot.matchNumber === 101);
  const sf102 = rightSlots.find((slot) => slot.matchNumber === 102);
  if (!sf101 || !sf102) return [];

  const sf101Y = slotCenterY(sf101);
  const sf102Y = slotCenterY(sf102);
  const finalTop = PODIUM_ABOVE + centerRow * ROW_HEIGHT - MATCH_HEIGHT / 2;
  const finalCenterY = finalTop + CENTER_LABEL_H + MATCH_HEIGHT / 2;
  const finalLeft = halfW + HALF_GAP + 12;
  const finalRight = finalLeft + MATCH_WIDTH;
  const midGap = HALF_GAP / 2;

  return [
    `M ${halfW} ${sf101Y} H ${halfW + midGap} V ${finalCenterY} H ${finalLeft}`,
    `M ${rightHalfX} ${sf102Y} H ${rightHalfX - midGap} V ${finalCenterY} H ${finalRight}`,
  ];
}

function thirdPlaceConnectorPaths(centerRow: number): string[] {
  const halfW = 4 * ROUND_WIDTH - CONNECTOR;
  const finalTop = PODIUM_ABOVE + centerRow * ROW_HEIGHT - MATCH_HEIGHT / 2;
  const thirdTop = thirdPlaceTop(centerRow) + CENTER_LABEL_H;
  const finalLeft = halfW + HALF_GAP + 12;
  const thirdCenterX = finalLeft + MATCH_WIDTH / 2;

  return [
    `M ${thirdCenterX} ${finalTop + CENTER_LABEL_H + MATCH_HEIGHT + 6} V ${thirdTop - 6}`,
  ];
}

function BracketCenterConnectors({
  leftSlots,
  rightSlots,
  centerRow,
  width,
  height,
}: {
  leftSlots: BracketLayoutSlot[];
  rightSlots: BracketLayoutSlot[];
  centerRow: number;
  width: number;
  height: number;
}) {
  const finalPaths = useMemo(
    () => centerConnectorPaths(leftSlots, rightSlots, centerRow),
    [leftSlots, rightSlots, centerRow]
  );
  const thirdPaths = useMemo(
    () => thirdPlaceConnectorPaths(centerRow),
    [centerRow]
  );

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-[5] text-zinc-500"
      width={width}
      height={height}
      aria-hidden
    >
      {finalPaths.map((path, index) => (
        <path
          key={`final-${index}`}
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {thirdPaths.map((path, index) => (
        <path
          key={`third-${index}`}
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
          opacity={0.75}
        />
      ))}
    </svg>
  );
}

function CenterMatches({
  matches,
  final,
  third,
  centerRow,
  onPickWinner,
  onFocusMatch,
}: {
  matches: Map<number, ResolvedKnockoutMatch>;
  final?: ResolvedKnockoutMatch;
  third?: ResolvedKnockoutMatch;
  centerRow: number;
  onPickWinner?: (matchNumber: number, teamId: string | null) => void;
  onFocusMatch: (clientX: number, clientY: number) => void;
}) {
  const finalTop = PODIUM_ABOVE + centerRow * ROW_HEIGHT - MATCH_HEIGHT / 2;
  const thirdTop = thirdPlaceTop(centerRow);

  return (
    <div
      className="relative shrink-0 px-3"
      style={{ width: MATCH_WIDTH + 24, height: centerColumnHeight(centerRow) }}
    >
      <div className="absolute left-3 right-3 top-0 z-20">
        <PodiumBoard matches={matches} />
      </div>
      {final && (
        <div className="absolute left-3 z-10" style={{ top: finalTop }}>
          <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-400">
            <TrophyIcon size={18} className="text-amber-400" />
            Chung kết
          </p>
          <BracketMatchSlot
            match={final}
            onPickWinner={(teamId) => onPickWinner?.(final.matchNumber, teamId)}
            onFocus={onFocusMatch}
          />
        </div>
      )}
      {third && (
        <div className="absolute left-3 z-10" style={{ top: thirdTop }}>
          <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600/90">
            <BronzeMedalIcon size={18} className="text-amber-600" />
            Hạng 3
          </p>
          <BracketMatchSlot
            match={third}
            onPickWinner={(teamId) => onPickWinner?.(third.matchNumber, teamId)}
            onFocus={onFocusMatch}
          />
        </div>
      )}
    </div>
  );
}

function computeBracketDimensions(centerRow: number) {
  const halfRounds = 4;
  const halfW = halfRounds * ROUND_WIDTH - CONNECTOR;
  const halfH = 8 * ROW_HEIGHT;
  const centerW = MATCH_WIDTH + 24;
  const centerH = centerColumnHeight(centerRow);
  const gap = 12;

  return {
    w: halfW * 2 + centerW + gap * 2,
    h: Math.max(halfH, centerH),
  };
}

function useBracketFit(
  containerRef: RefObject<HTMLDivElement | null>,
  dimensions: { w: number; h: number }
) {
  const [fitScale, setFitScale] = useState(1);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || !dimensions.w || !dimensions.h) return;

    const widthFit = (container.clientWidth - FIT_PAD) / dimensions.w;
    const heightFit = (container.clientHeight - FIT_PAD) / dimensions.h;
    const scale = Math.min(widthFit, heightFit);
    setFitScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
  }, [containerRef, dimensions]);

  useLayoutEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure, containerRef]);

  return fitScale;
}

export function BracketTree({ matches, onPickWinner }: Props) {
  const tree = useMemo(() => buildKnockoutTree(seed.knockout), []);
  const centerRow = useMemo(() => getBracketCenterRow(tree), [tree]);
  const leftLayout = useMemo(() => layoutBracketSubtree(tree.left), [tree.left]);
  const rightLayout = useMemo(() => layoutBracketSubtree(tree.right), [tree.right]);
  const final = matches.get(tree.final);
  const third = matches.get(tree.third);

  const hydrated = useStoreHydrated();
  const isMobile = useIsMobile();
  const bracketView = useSimulation((s) => s.bracketView);
  const setBracketView = useSimulation((s) => s.setBracketView);

  const containerRef = useRef<HTMLDivElement>(null);
  const bracketSize = useMemo(() => computeBracketDimensions(centerRow), [centerRow]);
  const fitScale = useBracketFit(containerRef, bracketSize);
  const isReadOnly = !onPickWinner;
  const displayFitScale =
    getDisplayFitScale(fitScale, isMobile) * (isReadOnly ? READ_ONLY_FIT_SCALE : 1);
  const [userZoom, setUserZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const viewRef = useRef({ userZoom: 1, pan: { x: 0, y: 0 } });
  const viewRestoredRef = useRef(false);
  const dragRef = useRef<DragState>({ ...EMPTY_DRAG });
  const pointersRef = useRef(new Map<number, PointerRecord>());
  const pinchRef = useRef<PinchState>({ ...EMPTY_PINCH });

  const scale = displayFitScale * userZoom;
  const zoomPercent = Math.round(userZoom * 100);

  const applyView = useCallback(
    (nextZoom: number, nextPan: Pan) => {
      const zoom = clampBracketZoom(nextZoom, isMobile);
      viewRef.current = { userZoom: zoom, pan: nextPan };
      setUserZoom(zoom);
      setPan(nextPan);
    },
    [isMobile]
  );

  const focusAt = useCallback(
    (clientX: number, clientY: number, targetZoom = MATCH_FOCUS_ZOOM) => {
      const el = containerRef.current;
      if (!el) return;

      const cursor = cursorFromEvent(el, clientX, clientY);
      const currentZoom = viewRef.current.userZoom;
      const nextZoom = Math.max(currentZoom, clampBracketZoom(targetZoom, isMobile));
      const nextPan = zoomPanToCursor(
        cursor,
        viewRef.current.pan,
        currentZoom,
        nextZoom,
        displayFitScale
      );
      applyView(nextZoom, nextPan);
    },
    [applyView, displayFitScale, isMobile]
  );

  useEffect(() => {
    viewRef.current = { userZoom, pan };
  }, [userZoom, pan]);

  useEffect(() => {
    if (!hydrated || viewRestoredRef.current || fitScale <= 0) return;
    viewRestoredRef.current = true;
    const initialZoom = resolveInitialBracketZoom(
      isReadOnly ? 1 : bracketView.userZoom,
      fitScale,
      isMobile
    );
    applyView(initialZoom, isReadOnly ? READ_ONLY_INITIAL_PAN : bracketView.pan);
  }, [hydrated, fitScale, isMobile, bracketView, applyView, isReadOnly]);

  useEffect(() => {
    if (isReadOnly || !hydrated || !viewRestoredRef.current) return;
    setBracketView({ userZoom, pan });
  }, [hydrated, isReadOnly, userZoom, pan, setBracketView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const cursor = cursorFromEvent(el, e.clientX, e.clientY);
      const currentZoom = viewRef.current.userZoom;
      const nextZoom = clampBracketZoom(currentZoom * factor, isMobile);
      const nextPan = zoomPanToCursor(
        cursor,
        viewRef.current.pan,
        currentZoom,
        nextZoom,
        displayFitScale
      );
      applyView(nextZoom, nextPan);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyView, displayFitScale, isMobile]);

  const cancelDrag = useCallback((el: HTMLElement, pointerId?: number) => {
    const drag = dragRef.current;
    if (drag.active && pointerId !== undefined) {
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        /* capture may already be released */
      }
    }
    dragRef.current = { ...EMPTY_DRAG };
    setIsDragging(false);
  }, []);

  const beginPinch = useCallback(
    (el: HTMLElement) => {
      const pts = Array.from(pointersRef.current.values());
      if (pts.length < 2) return;

      const dist = pointerDistance(pts[0], pts[1]);
      if (dist < 24) return;

      pinchRef.current = {
        active: true,
        startDistance: dist,
        startZoom: viewRef.current.userZoom,
        startPan: { ...viewRef.current.pan },
        center: pointerCenter(pts[0], pts[1], el),
      };
      cancelDrag(el);
    },
    [cancelDrag]
  );

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size < 2) {
      pinchRef.current = { ...EMPTY_PINCH };
    }

    const drag = dragRef.current;
    if (drag.pointerId !== e.pointerId) return;

    if (drag.active) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be released */
      }
    }

    dragRef.current = { ...EMPTY_DRAG };
    setIsDragging(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      beginPinch(e.currentTarget);
      return;
    }

    if ((e.target as HTMLElement).closest("button")) return;

    dragRef.current = {
      pointerId: e.pointerId,
      pending: true,
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pinch = pinchRef.current;
    if (pinch.active && pointersRef.current.size >= 2) {
      e.preventDefault();
      const pts = Array.from(pointersRef.current.values());
      if (pts.length < 2) return;

      const dist = pointerDistance(pts[0], pts[1]);
      const ratio = dist / pinch.startDistance;
      const nextZoom = clampBracketZoom(pinch.startZoom * ratio, isMobile);
      const nextPan = zoomPanToCursor(
        pinch.center,
        pinch.startPan,
        pinch.startZoom,
        nextZoom,
        displayFitScale
      );
      applyView(nextZoom, nextPan);
      return;
    }

    if (pointersRef.current.size > 1) return;

    const drag = dragRef.current;
    if (drag.pointerId !== e.pointerId) return;

    if (drag.pending && !drag.active) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      dragRef.current = { ...drag, pending: false, active: true };
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
    }

    if (!dragRef.current.active) return;

    e.preventDefault();
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current = {
      ...dragRef.current,
      lastX: e.clientX,
      lastY: e.clientY,
    };

    const nextPan = {
      x: viewRef.current.pan.x + dx,
      y: viewRef.current.pan.y + dy,
    };
    viewRef.current = { ...viewRef.current, pan: nextPan };
    setPan(nextPan);
  };

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const el = containerRef.current;
      if (!el) return;

      const cursor = { x: 0, y: 0 };
      const currentZoom = viewRef.current.userZoom;
      const nextZoom = clampBracketZoom(currentZoom * factor, isMobile);
      const nextPan = zoomPanToCursor(
        cursor,
        viewRef.current.pan,
        currentZoom,
        nextZoom,
        displayFitScale
      );
      applyView(nextZoom, nextPan);
    },
    [applyView, displayFitScale, isMobile]
  );

  const fitToFrame = () => {
    applyView(1, isReadOnly ? READ_ONLY_INITIAL_PAN : { x: 0, y: 0 });
  };

  return (
    <div className="flex h-full min-h-0 w-full overscroll-none">
      <div
        ref={containerRef}
        className={`relative h-full min-h-0 w-full touch-none select-none overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950/40 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button") || target.closest("[data-match-slot]")) return;
          fitToFrame();
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 select-none"
          style={{
            left: `calc(50% + ${pan.x}px)`,
            top: `calc(50% + ${pan.y}px)`,
            width: bracketSize.w,
            height: bracketSize.h,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <BracketCenterConnectors
            leftSlots={leftLayout.slots}
            rightSlots={rightLayout.slots}
            centerRow={centerRow}
            width={bracketSize.w}
            height={bracketSize.h}
          />
          <div className="relative flex items-start justify-center gap-3">
          <BracketHalf
            root={tree.left}
            side="left"
            matches={matches}
            onPickWinner={onPickWinner}
            onFocusMatch={focusAt}
          />
          <CenterMatches
            matches={matches}
            final={final}
            third={third}
            centerRow={centerRow}
            onPickWinner={onPickWinner}
            onFocusMatch={focusAt}
          />
          <BracketHalf
            root={tree.right}
            side="right"
            matches={matches}
            onPickWinner={onPickWinner}
            onFocusMatch={focusAt}
          />
          </div>
        </div>
        {!isReadOnly && (
          <div
          data-testid="bracket-zoom-hint"
          className="pointer-events-none absolute inset-x-0 bottom-2 z-20 px-2 sm:px-3 text-center text-[10px] sm:text-xs text-zinc-500"
          >
          <span className="sm:hidden">
            {`Bấm đội · Kéo xem các vòng · Chụm hoặc +/− phóng to (${zoomPercent}%)`}
          </span>
          <span className="hidden sm:inline">
            {`Bấm đội chọn người thắng · Lăn chuột phóng to (tối thiểu 100%) · Kéo nền di chuyển · Double-click trận phóng to (${zoomPercent}%)`}
          </span>
          </div>
        )}
        <div
          className={[
            "absolute bottom-2 z-30 flex items-center gap-1",
            isReadOnly
              ? "left-1/2 -translate-x-1/2"
              : "right-2 sm:right-3",
          ].join(" ")}
        >
          <button
            type="button"
            data-testid="bracket-zoom-out"
            onClick={() => zoomAtCenter(1 / ZOOM_FACTOR)}
            disabled={userZoom <= 1}
            className="rounded-md border border-zinc-700 bg-zinc-950/80 px-2 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Thu nhỏ"
          >
            −
          </button>
          <button
            type="button"
            data-testid="bracket-zoom-in"
            onClick={() => zoomAtCenter(ZOOM_FACTOR)}
            disabled={userZoom >= getMaxZoom(isMobile)}
            className="rounded-md border border-zinc-700 bg-zinc-950/80 px-2 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Phóng to"
          >
            +
          </button>
          <button
            type="button"
            data-testid="bracket-fit-frame"
            onClick={fitToFrame}
            className="rounded-md border border-zinc-700 bg-zinc-950/80 px-2 py-1 text-[10px] sm:text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Vừa khung
          </button>
        </div>
      </div>
    </div>
  );
}
