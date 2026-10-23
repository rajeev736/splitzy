/**
 * Categorical chart colors. Slots 1–3 of the validated reference palette
 * (blue, orange, aqua) — CVD-safe across all pairs in both themes. Dark mode
 * uses its own selected steps, not an automatic flip. Assigned in fixed order;
 * color follows the entity, never its rank.
 *
 * Light aqua is under 3:1 on white, so every chart using it also shows visible
 * value labels or a table view.
 */
export const CHART_SERIES_VARS =
  "[--series-1:#2a78d6] [--series-2:#eb6834] [--series-3:#1baf7a] " +
  "dark:[--series-1:#3987e5] dark:[--series-2:#d95926] dark:[--series-3:#199e70]"

export const seriesColor = (slot: 1 | 2 | 3) => `var(--series-${slot})`

export interface ChartSeries {
  key: string
  label: string
  color: string
}
