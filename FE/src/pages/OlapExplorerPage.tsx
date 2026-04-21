import { useEffect, useMemo, useRef, useState } from 'react'
import { executeOlapQuery } from '../api/olapApi'
import ErrorState from '../components/common/ErrorState'
import Loading from '../components/common/Loading'
import MultiSelectFilter from '../components/common/MultiSelectFilter'
import DataTable from '../components/tables/DataTable'
import { useOlapMetadata } from '../hooks/useOlapMetadata'
import type { QueryResultDto } from '../types/api'
import type { SelectOption } from '../types/filter'
import type { OlapDimension, OlapMeasureMetadata } from '../types/olap'
import type { TableColumn, TableRow } from '../types/report'
import { formatNumber } from '../utils/format'

const LEVEL_DRAG_MIME = 'application/x-olap-tree-level-v2'
const SELECTED_LEVEL_DRAG_MIME = 'application/x-olap-selected-level-v2'
const PAGE_SIZE = 200

interface CubeOption {
  value: string
  label: string
  measures: OlapMeasureMetadata[]
}

interface SelectedLevel {
  id: string
  dimension: OlapDimension
  dimensionLabel: string
  levelKey: string
  levelLabel: string
  levelIndex: number
  levelExpression: string
  hierarchyKey?: string | null
  hierarchyLabel?: string | null
  hierarchyOrder?: number | null
}

interface LevelDragPayload {
  dimension: OlapDimension
  dimensionLabel: string
  levelKey: string
  levelLabel: string
  levelIndex: number
  levelExpression: string
  hierarchyKey?: string | null
  hierarchyLabel?: string | null
  hierarchyOrder?: number | null
}

interface DisplayTable {
  columns: TableColumn[]
  rows: TableRow[]
  total: number
}

interface PivotRenderData {
  levelRows: Array<{
    label: string
    values: string[]
  }>
  measureRows: Array<{
    label: string
    values: string[]
  }>
}

interface MemberColumns {
  captionColumn: string
  uniqueColumn: string
}

const EMPTY_TABLE: DisplayTable = {
  columns: [],
  rows: [],
  total: 0,
}

function toSelectedLevel(payload: LevelDragPayload): SelectedLevel {
  return {
    id: buildLevelId(payload.dimension, payload.levelKey),
    dimension: payload.dimension,
    dimensionLabel: payload.dimensionLabel,
    levelKey: payload.levelKey,
    levelLabel: payload.levelLabel,
    levelIndex: payload.levelIndex,
    levelExpression: payload.levelExpression,
    hierarchyKey: payload.hierarchyKey ?? null,
    hierarchyLabel: payload.hierarchyLabel ?? null,
    hierarchyOrder: payload.hierarchyOrder ?? null,
  }
}

function omitRecordKey<T>(source: Record<string, T>, key: string): Record<string, T> {
  const next = { ...source }
  delete next[key]
  return next
}

function buildLevelValueMap(
  selectedLevels: SelectedLevel[],
  source?: Record<string, string[]>,
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  selectedLevels.forEach((level) => {
    next[level.id] = source?.[level.id] ? [...source[level.id]] : []
  })
  return next
}

function buildLevelId(dimension: OlapDimension, levelKey: string): string {
  return `${dimension}::${levelKey}`
}

function formatCubeLabel(cubeType: string, cubeName: string): string {
  const normalized = cubeType.trim().toLowerCase()
  if (normalized === 'banhang') {
    return `Bán hàng (${cubeName})`
  }

  if (normalized === 'tonkho') {
    return `Tồn kho (${cubeName})`
  }

  return `${cubeType} (${cubeName})`
}

function escapeMdxIdentifier(value: string): string {
  return value.replace(/]/g, ']]')
}

function parseMemberKeys(raw: string): string[] {
  return [...raw.matchAll(/&\[([^\]]+)\]/g)].map((match) => match[1].trim())
}

function parseMemberCaption(raw: string): string {
  const keyMatches = parseMemberKeys(raw)
  if (keyMatches.length > 0) {
    return keyMatches[keyMatches.length - 1]
  }

  const bracketMatches = [...raw.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1].trim())
  if (bracketMatches.length > 0) {
    return bracketMatches[bracketMatches.length - 1]
  }

  return raw.trim()
}

function tryParseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const asInvariant = Number(trimmed.replace(/,/g, ''))
  if (Number.isFinite(asInvariant)) {
    return asInvariant
  }

  const asVi = Number(trimmed.replace(/\./g, '').replace(',', '.'))
  if (Number.isFinite(asVi)) {
    return asVi
  }

  return null
}

function formatMeasureValue(value: string): string {
  const parsed = tryParseNumber(value)
  if (parsed === null) {
    return value || '-'
  }

  return formatNumber(parsed)
}

function formatTimeCaption(level: SelectedLevel, captionRaw: string, uniqueRaw: string): string {
  const caption = captionRaw.trim() || parseMemberCaption(uniqueRaw)
  const keys = parseMemberKeys(uniqueRaw)

  if (level.levelKey === 'year') {
    return keys[keys.length - 1] ?? caption
  }

  if (level.levelKey === 'quarter') {
    if (keys.length >= 2) {
      return `${keys[keys.length - 2]} - Q${keys[keys.length - 1]}`
    }

    return caption.startsWith('Q') ? caption.toUpperCase() : `Q${caption}`
  }

  if (level.levelKey === 'month') {
    if (keys.length >= 2) {
      return `${keys[keys.length - 2]} - Thang ${keys[keys.length - 1]}`
    }

    return caption.startsWith('Thang ') ? caption : `Thang ${caption}`
  }

  return caption
}

function formatLevelCell(level: SelectedLevel, captionRaw: string, uniqueRaw: string): string {
  if (level.dimension !== 'time') {
    return captionRaw.trim() || parseMemberCaption(uniqueRaw)
  }

  return formatTimeCaption(level, captionRaw, uniqueRaw)
}

function resolveMemberColumns(columns: string[]): MemberColumns {
  const firstColumn = columns[0] ?? ''
  const captionColumn = columns.find((column) => column.includes('[MEMBER_CAPTION]')) ?? firstColumn
  const uniqueColumn = columns.find((column) => column.includes('[MEMBER_UNIQUE_NAME]')) ?? captionColumn
  return {
    captionColumn,
    uniqueColumn,
  }
}

function membersQuery(cubeName: string, levelExpression: string): string {
  return [
    'SELECT {[Measures].DefaultMember} ON COLUMNS,',
    `NON EMPTY ${levelExpression}.MEMBERS DIMENSION PROPERTIES MEMBER_CAPTION, MEMBER_UNIQUE_NAME ON ROWS`,
    `FROM [${escapeMdxIdentifier(cubeName)}]`,
  ].join(' ')
}

function toOptionValue(captionRaw: string, uniqueRaw: string): string {
  if (uniqueRaw.startsWith('[')) {
    return uniqueRaw
  }

  return parseMemberCaption(captionRaw)
}

function toMemberOptions(result: QueryResultDto, level: SelectedLevel): SelectOption[] {
  if (result.columns.length === 0) {
    return []
  }

  const { captionColumn, uniqueColumn } = resolveMemberColumns(result.columns)
  const seen = new Set<string>()
  const options: SelectOption[] = []

  result.rows.forEach((row) => {
    const captionRaw = (row[captionColumn] ?? '').trim()
    const uniqueRaw = (row[uniqueColumn] ?? '').trim()
    const value = toOptionValue(captionRaw, uniqueRaw)

    if (!value || seen.has(value)) {
      return
    }

    seen.add(value)
    options.push({
      value,
      label: formatLevelCell(level, captionRaw, uniqueRaw),
    })
  })

  return options
}

function normalizeFilterMap(
  source: Record<string, string[]>,
  selectedLevels: SelectedLevel[],
  optionsByLevel: Record<string, SelectOption[]>,
): Record<string, string[]> {
  const allowedIds = new Set(selectedLevels.map((level) => level.id))
  const next: Record<string, string[]> = {}

  Object.entries(source).forEach(([levelId, values]) => {
    if (!allowedIds.has(levelId)) {
      return
    }

    const options = optionsByLevel[levelId]
    if (!options || options.length === 0) {
      next[levelId] = []
      return
    }

    const allowedValues = new Set(options.map((item) => item.value))
    next[levelId] = values.filter((item) => allowedValues.has(item))
  })

  selectedLevels.forEach((level) => {
    if (!next[level.id]) {
      next[level.id] = []
    }
  })

  return next
}

function buildMemberSetExpression(values: string[]): string {
  const uniqueMembers = values
    .map((item) => item.trim())
    .filter((item) => item.startsWith('['))

  return `{ ${uniqueMembers.join(', ')} }`
}

function buildCrossJoin(sets: string[]): string {
  if (sets.length === 0) {
    return ''
  }

  return sets.reduce((accumulator, current) => {
    if (!accumulator) {
      return current
    }

    return `CROSSJOIN(${accumulator}, ${current})`
  }, '')
}

function buildExplorerMdx(
  measureExpressions: string[],
  cubeName: string,
  selectedLevels: SelectedLevel[],
  appliedFilters: Record<string, string[]>,
  rowOffset: number,
  pageSize: number,
): string {
  const measuresSet = `{ ${measureExpressions.join(', ')} }`

  if (selectedLevels.length === 0) {
    return [
      `SELECT ${measuresSet} ON COLUMNS`,
      `FROM [${escapeMdxIdentifier(cubeName)}]`,
    ].join('\n')
  }

  const levelSets = selectedLevels.map((level) => {
    const baseSet = `${level.levelExpression}.MEMBERS`
    const members = appliedFilters[level.id] ?? []
    if (members.length === 0) {
      return baseSet
    }

    const memberSet = buildMemberSetExpression(members)
    if (memberSet === '{  }') {
      return baseSet
    }

    return `INTERSECT(${memberSet}, ${baseSet})`
  })

  const combinedSet = buildCrossJoin(levelSets)
  const limitedRows = `SUBSET(NONEMPTY(${combinedSet}, ${measuresSet}), ${Math.max(0, rowOffset)}, ${pageSize})`
  return [
    'SELECT',
    `  ${measuresSet} ON COLUMNS,`,
    `  ${limitedRows} DIMENSION PROPERTIES MEMBER_CAPTION, MEMBER_UNIQUE_NAME ON ROWS`,
    `FROM [${escapeMdxIdentifier(cubeName)}]`,
  ].join('\n')
}

function normalizeFlatTable(
  result: QueryResultDto,
  selectedLevels: SelectedLevel[],
  measureLabels: string[],
): DisplayTable {
  const captionColumns = result.columns.filter((column) => column.includes('[MEMBER_CAPTION]'))
  const uniqueColumns = new Set(result.columns.filter((column) => column.includes('[MEMBER_UNIQUE_NAME]')))
  const valueColumns = result.columns.filter(
    (column) => !column.includes('[MEMBER_CAPTION]') && !column.includes('[MEMBER_UNIQUE_NAME]'),
  )

  if (selectedLevels.length === 0) {
    const measureColumns = valueColumns.length > 0
      ? valueColumns
      : result.columns.filter((column) => !uniqueColumns.has(column))
    const columns: TableColumn[] = measureColumns.map((_, index) => ({
      key: `measure_${index}`,
      label: measureLabels[index] ?? `Độ đo ${index + 1}`,
      align: 'center',
    }))

    const row: TableRow = {}
    let total = 0
    measureColumns.forEach((column, index) => {
      const rawValue = result.rows[0]?.[column] ?? '0'
      const parsed = tryParseNumber(rawValue)
      if (parsed !== null) {
        total += parsed
      }
      row[`measure_${index}`] = formatMeasureValue(rawValue)
    })

    return {
      columns,
      rows: [row],
      total,
    }
  }

  const columns: TableColumn[] = []

  captionColumns.forEach((_, index) => {
    const selectedLevel = selectedLevels[index]
    columns.push({
      key: `level_${index}`,
      label: selectedLevel
        ? selectedLevel.levelLabel
        : `Chiều ${index + 1}`,
      align: 'center',
    })
  })

  valueColumns.forEach((_column, index) => {
    columns.push({
      key: `value_${index}`,
      label: measureLabels[index] ?? `Độ đo ${index + 1}`,
      align: 'center',
    })
  })

  let total = 0
  const rows: TableRow[] = result.rows.map((sourceRow) => {
    const targetRow: TableRow = {}

    captionColumns.forEach((captionColumn, index) => {
      const uniqueColumn = captionColumn.replace('[MEMBER_CAPTION]', '[MEMBER_UNIQUE_NAME]')
      const selectedLevel = selectedLevels[index]
      const captionRaw = sourceRow[captionColumn] ?? ''
      const uniqueRaw = sourceRow[uniqueColumn] ?? ''

      targetRow[`level_${index}`] = selectedLevel
        ? formatLevelCell(selectedLevel, captionRaw, uniqueRaw)
        : (captionRaw || parseMemberCaption(uniqueRaw) || '-')
    })

    valueColumns.forEach((valueColumn, index) => {
      const rawValue = sourceRow[valueColumn] ?? ''
      const parsed = tryParseNumber(rawValue)
      if (parsed !== null) {
        total += parsed
      }
      targetRow[`value_${index}`] = formatMeasureValue(rawValue)
    })

    return targetRow
  })

  return {
    columns,
    rows,
    total,
  }
}

function toPivotRenderData(
  table: DisplayTable,
  selectedLevels: SelectedLevel[],
  measureLabels: string[],
): PivotRenderData {
  const levelRows = selectedLevels.map((level, levelIndex) => ({
    label: level.levelLabel,
    values: table.rows.map((row) => String(row[`level_${levelIndex}`] ?? '-')),
  }))

  const measureRows = measureLabels.map((label, measureIndex) => ({
    label,
    values: table.rows.map((row) => String(row[`value_${measureIndex}`] ?? '-')),
  }))

  return {
    levelRows,
    measureRows,
  }
}

function safeParseLevelPayload(raw: string): LevelDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LevelDragPayload>
    if (!parsed.dimension || !parsed.levelKey || !parsed.levelExpression || typeof parsed.levelIndex !== 'number') {
      return null
    }

    return {
      dimension: parsed.dimension,
      dimensionLabel: parsed.dimensionLabel ?? parsed.dimension,
      levelKey: parsed.levelKey,
      levelLabel: parsed.levelLabel ?? parsed.levelKey,
      levelIndex: parsed.levelIndex,
      levelExpression: parsed.levelExpression,
      hierarchyKey: parsed.hierarchyKey ?? null,
      hierarchyLabel: parsed.hierarchyLabel ?? null,
      hierarchyOrder: typeof parsed.hierarchyOrder === 'number' ? parsed.hierarchyOrder : null,
    }
  } catch {
    return null
  }
}

export default function OlapExplorerPage() {
  const [selectedCubeName, setSelectedCubeName] = useState('')
  const [selectedMeasureKey, setSelectedMeasureKey] = useState('')
  const [selectedMeasureKeys, setSelectedMeasureKeys] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<SelectedLevel[]>([])
  const [expandedDimensions, setExpandedDimensions] = useState<Partial<Record<OlapDimension, boolean>>>({})
  const [isPivoted, setIsPivoted] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [, setLastAction] = useState('Sẵn sàng')
  const [mdxPreview, setMdxPreview] = useState('')

  const [draftFilters, setDraftFilters] = useState<Record<string, string[]>>({})
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({})
  const [optionsByLevel, setOptionsByLevel] = useState<Record<string, SelectOption[]>>({})
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)

  const [table, setTable] = useState<DisplayTable>(EMPTY_TABLE)
  const tableRef = useRef<DisplayTable>(EMPTY_TABLE)
  const loadMoreScrollYRef = useRef<number | null>(null)
  const [pivotData, setPivotData] = useState<PivotRenderData | null>(null)
  const [isQueryLoading, setIsQueryLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [rowOffset, setRowOffset] = useState(0)
  const [hasMoreRows, setHasMoreRows] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  const {
    metadata,
    isLoading: isMetadataLoading,
    error: metadataError,
  } = useOlapMetadata()

  const restoreScrollAfterLoadMore = () => {
    const targetY = loadMoreScrollYRef.current
    if (targetY === null) {
      return
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: targetY,
          behavior: 'auto',
        })
        loadMoreScrollYRef.current = null
      })
    })
  }

  function resetPagination() {
    setRowOffset(0)
    setHasMoreRows(false)
  }

  function clearWorkspaceSelections() {
    setSelectedLevels([])
    setDraftFilters({})
    setAppliedFilters({})
    setOptionsByLevel({})
    setIsPivoted(false)
    resetPagination()
  }

  useEffect(() => {
    tableRef.current = table
  }, [table])

  const cubeOptions = useMemo<CubeOption[]>(() => {
    const groups = new Map<string, CubeOption>()

    metadata.measures.forEach((measure) => {
      const existing = groups.get(measure.cubeName)
      if (existing) {
        existing.measures.push(measure)
        return
      }

      groups.set(measure.cubeName, {
        value: measure.cubeName,
        label: formatCubeLabel(measure.cubeType, measure.cubeName),
        measures: [measure],
      })
    })

    return Array.from(groups.values())
  }, [metadata.measures])

  useEffect(() => {
    if (cubeOptions.length === 0) {
      return
    }

    if (!selectedCubeName || !cubeOptions.some((cube) => cube.value === selectedCubeName)) {
      const firstCube = cubeOptions[0]
      setSelectedCubeName(firstCube.value)
      setSelectedMeasureKey(firstCube.measures[0]?.key ?? '')
      setSelectedMeasureKeys(firstCube.measures[0] ? [firstCube.measures[0].key] : [])
    }
  }, [cubeOptions, selectedCubeName])

  const selectedCube = useMemo(
    () => cubeOptions.find((cube) => cube.value === selectedCubeName) ?? null,
    [cubeOptions, selectedCubeName],
  )

  useEffect(() => {
    if (!selectedCube || selectedCube.measures.length === 0) {
      return
    }

    if (!selectedCube.measures.some((measure) => measure.key === selectedMeasureKey)) {
      setSelectedMeasureKey(selectedCube.measures[0].key)
    }
  }, [selectedCube, selectedMeasureKey])

  useEffect(() => {
    if (!selectedCube || selectedCube.measures.length === 0) {
      setSelectedMeasureKeys([])
      return
    }

    const allowed = new Set(selectedCube.measures.map((measure) => measure.key))
    const normalized = selectedMeasureKeys.filter((key) => allowed.has(key))
    if (normalized.length === 0) {
      setSelectedMeasureKeys([selectedCube.measures[0].key])
      return
    }

    if (normalized.length !== selectedMeasureKeys.length) {
      setSelectedMeasureKeys(normalized)
    }
  }, [selectedCube, selectedMeasureKeys])

  const selectedMeasure = useMemo(
    () => selectedCube?.measures.find((measure) => measure.key === selectedMeasureKey) ?? null,
    [selectedCube, selectedMeasureKey],
  )

  const activeMeasures = useMemo(() => {
    if (!selectedCube) {
      return [] as OlapMeasureMetadata[]
    }

    const picked = selectedCube.measures.filter((measure) => selectedMeasureKeys.includes(measure.key))
    if (picked.length > 0) {
      return picked
    }

    return selectedMeasure ? [selectedMeasure] : []
  }, [selectedCube, selectedMeasure, selectedMeasureKeys])

  const activeMeasureExpressions = useMemo(
    () => activeMeasures.map((measure) => measure.measureExpression),
    [activeMeasures],
  )

  const activeMeasureLabels = useMemo(
    () => activeMeasures.map((measure) => measure.label),
    [activeMeasures],
  )

  const dimensionsForMeasure = useMemo(
    () => selectedMeasure?.dimensions ?? [],
    [selectedMeasure],
  )

  const allowedDimensionKeys = useMemo(
    () => new Set(dimensionsForMeasure.map((dimension) => dimension.key)),
    [dimensionsForMeasure],
  )

  useEffect(() => {
    if (!selectedMeasure) {
      setSelectedLevels([])
      return
    }

    setSelectedLevels((previous) => previous.filter((level) => allowedDimensionKeys.has(level.dimension)))
  }, [allowedDimensionKeys, selectedMeasure])

  useEffect(() => {
    setExpandedDimensions((previous) => {
      const next = { ...previous }
      dimensionsForMeasure.forEach((dimension) => {
        if (typeof next[dimension.key] === 'undefined') {
          next[dimension.key] = false
        }
      })
      return next
    })
  }, [dimensionsForMeasure])

  useEffect(() => {
    setDraftFilters((previous) => buildLevelValueMap(selectedLevels, previous))
    setAppliedFilters((previous) => buildLevelValueMap(selectedLevels, previous))
  }, [selectedLevels])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      if (!selectedMeasure || selectedLevels.length === 0) {
        setOptionsByLevel({})
        setFilterError(null)
        setIsFilterLoading(false)
        return
      }

      setIsFilterLoading(true)
      setFilterError(null)

      try {
        const responses = await Promise.all(
          selectedLevels.map(async (level) => {
            const result = await executeOlapQuery(
              selectedMeasure.cubeName,
              membersQuery(selectedMeasure.cubeName, level.levelExpression),
            )

            return {
              level,
              options: toMemberOptions(result, level),
            }
          }),
        )

        if (!isActive) {
          return
        }

        const nextOptions: Record<string, SelectOption[]> = {}
        responses.forEach((item) => {
          nextOptions[item.level.id] = item.options
        })

        setOptionsByLevel(nextOptions)
        setDraftFilters((previous) => normalizeFilterMap(previous, selectedLevels, nextOptions))
        setAppliedFilters((previous) => normalizeFilterMap(previous, selectedLevels, nextOptions))
      } catch (error) {
        if (!isActive) {
          return
        }

        const message = error instanceof Error ? error.message : 'Không thể tải giá trị cho bộ lọc.'
        setFilterError(message)
        setOptionsByLevel({})
      } finally {
        if (isActive) {
          setIsFilterLoading(false)
        }
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [selectedLevels, selectedMeasure, refreshToken])

  useEffect(() => {
    resetPagination()
  }, [activeMeasureExpressions, appliedFilters, refreshToken, selectedLevels, selectedMeasure])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      if (!selectedMeasure) {
        tableRef.current = EMPTY_TABLE
        setTable(EMPTY_TABLE)
        setPivotData(null)
        setHasMoreRows(false)
        setQueryError(null)
        setIsLoadingMore(false)
        setIsQueryLoading(false)
        return
      }

      const isLoadMoreRequest = selectedLevels.length > 0 && rowOffset > 0
      if (isLoadMoreRequest) {
        setIsLoadingMore(true)
      } else {
        setIsQueryLoading(true)
      }
      setQueryError(null)

      try {
        const measureExpressions = activeMeasureExpressions.length > 0
          ? activeMeasureExpressions
          : [selectedMeasure.measureExpression]
        const measureLabels = activeMeasureLabels.length > 0
          ? activeMeasureLabels
          : [selectedMeasure.label]
        const mdx = buildExplorerMdx(
          measureExpressions,
          selectedMeasure.cubeName,
          selectedLevels,
          appliedFilters,
          rowOffset,
          PAGE_SIZE,
        )

        setMdxPreview(mdx)
        const queryResult = await executeOlapQuery(selectedMeasure.cubeName, mdx)

        if (!isActive) {
          return
        }

        const normalized = normalizeFlatTable(
          queryResult,
          selectedLevels,
          measureLabels,
        )
        const nextTable = isLoadMoreRequest
          ? {
              columns: tableRef.current.columns.length > 0 ? tableRef.current.columns : normalized.columns,
              rows: [...tableRef.current.rows, ...normalized.rows],
              total: tableRef.current.total + normalized.total,
            }
          : normalized

        tableRef.current = nextTable
        setTable(nextTable)
        setHasMoreRows(selectedLevels.length > 0 && normalized.rows.length === PAGE_SIZE)
        setPivotData(
          selectedLevels.length > 0
            ? toPivotRenderData(
              nextTable,
              selectedLevels,
              measureLabels,
            )
            : null,
        )
        if (isLoadMoreRequest) {
          restoreScrollAfterLoadMore()
        }
      } catch (error) {
        if (!isActive) {
          return
        }

        const message = error instanceof Error ? error.message : 'Không thể lấy dữ liệu từ khối OLAP.'
        if (!isLoadMoreRequest) {
          setQueryError(message)
          tableRef.current = EMPTY_TABLE
          setTable(EMPTY_TABLE)
          setPivotData(null)
          setHasMoreRows(false)
        } else {
          setLastAction(`Tải thêm dữ liệu thất bại: ${message}`)
          restoreScrollAfterLoadMore()
        }
      } finally {
        if (isActive) {
          if (isLoadMoreRequest) {
            setIsLoadingMore(false)
          } else {
            setIsQueryLoading(false)
          }
        }
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [activeMeasureExpressions, activeMeasureLabels, appliedFilters, refreshToken, rowOffset, selectedLevels, selectedMeasure])

  const selectedLevelIds = useMemo(
    () => new Set(selectedLevels.map((level) => level.id)),
    [selectedLevels],
  )

  const handleCubeChange = (nextCubeName: string) => {
    const nextCube = cubeOptions.find((cube) => cube.value === nextCubeName)
    if (!nextCube || nextCube.measures.length === 0) {
      return
    }

    setSelectedCubeName(nextCubeName)
    setSelectedMeasureKey(nextCube.measures[0].key)
    setSelectedMeasureKeys([nextCube.measures[0].key])
    setExpandedDimensions({})
    clearWorkspaceSelections()
    setLastAction(`Đã chuyển khối dữ liệu: ${nextCubeName}`)
  }

  const toggleMeasureSelection = (measureKey: string) => {
    setSelectedMeasureKeys((previous) => {
      if (!previous.includes(measureKey)) {
        setSelectedMeasureKey(measureKey)
        setLastAction('Đã thêm độ đo vào kết quả.')
        return [...previous, measureKey]
      }

      if (previous.length <= 1) {
        setLastAction('Cần giữ ít nhất 1 độ đo.')
        return previous
      }

      const next = previous.filter((key) => key !== measureKey)
      if (measureKey === selectedMeasureKey) {
        setSelectedMeasureKey(next[0])
      }
      setLastAction('Đã bỏ độ đo khỏi kết quả.')
      return next
    })
  }

  const handleDropLevel = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    if (event.dataTransfer.types.includes(SELECTED_LEVEL_DRAG_MIME)) {
      return
    }

    const rawPayload = event.dataTransfer.getData(LEVEL_DRAG_MIME)
      || event.dataTransfer.getData('text/plain')
    const payload = safeParseLevelPayload(rawPayload)
    if (!payload) {
      return
    }

    const nextLevel = toSelectedLevel(payload)

    if (!allowedDimensionKeys.has(nextLevel.dimension)) {
      setLastAction('Mức không thuộc độ đo hiện tại.')
      return
    }

    if (selectedLevelIds.has(nextLevel.id)) {
      setLastAction('Mức đã tồn tại trong bố cục.')
      return
    }

    setSelectedLevels((previous) => [...previous, nextLevel])
    setLastAction(`Đã thêm mức ${nextLevel.dimensionLabel} - ${nextLevel.levelLabel}.`)
  }

  const toggleLevelFromTree = (payload: LevelDragPayload) => {
    const nextLevel = toSelectedLevel(payload)

    if (!allowedDimensionKeys.has(nextLevel.dimension)) {
      setLastAction('Mức không thuộc độ đo hiện tại.')
      return
    }

    if (selectedLevelIds.has(nextLevel.id)) {
      removeLevel(nextLevel.id)
      setLastAction(`Đã xóa mức ${nextLevel.dimensionLabel} - ${nextLevel.levelLabel}.`)
      return
    }

    setSelectedLevels((previous) => [...previous, nextLevel])
    setLastAction(`Đã thêm mức ${nextLevel.dimensionLabel} - ${nextLevel.levelLabel}.`)
  }

  const reorderSelectedLevels = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) {
      return
    }

    setSelectedLevels((previous) => {
      const sourceIndex = previous.findIndex((item) => item.id === draggedId)
      const targetIndex = previous.findIndex((item) => item.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) {
        return previous
      }

      const next = [...previous]
      const [item] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
    setLastAction('Đã sắp xếp lại thứ tự mức.')
  }

  const removeLevel = (levelId: string) => {
    setSelectedLevels((previous) => previous.filter((level) => level.id !== levelId))
    setDraftFilters((previous) => omitRecordKey(previous, levelId))
    setAppliedFilters((previous) => omitRecordKey(previous, levelId))
    setOptionsByLevel((previous) => omitRecordKey(previous, levelId))
    setLastAction('Đã xóa mức khỏi bố cục.')
  }

  const getHierarchyRollTarget = (level: SelectedLevel, direction: -1 | 1) => {
    const dimension = dimensionsForMeasure.find((item) => item.key === level.dimension)
    if (!dimension) {
      return null
    }

    let chain = dimension.levels
      .filter((item) => item.hierarchyKey === level.hierarchyKey && item.hierarchyOrder != null)
      .sort((left, right) => (left.hierarchyOrder ?? 0) - (right.hierarchyOrder ?? 0))

    if (chain.length === 0) {
      const fallbackOrderByDimension: Partial<Record<OlapDimension, string[]>> = {
        time: ['year', 'quarter', 'month'],
        store: ['state', 'city', 'store'],
        customer: ['cityCode', 'customerName'],
      }

      const fallbackOrder = fallbackOrderByDimension[level.dimension] ?? []
      if (fallbackOrder.length > 0) {
        chain = fallbackOrder
          .map((key) => dimension.levels.find((item) => item.key === key))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      }
    }

    if (chain.length === 0) {
      return null
    }

    const currentPosition = chain.findIndex((item) => item.key === level.levelKey)
    if (currentPosition < 0) {
      return null
    }

    const targetPosition = currentPosition + direction
    if (targetPosition < 0 || targetPosition >= chain.length) {
      return null
    }

    const target = chain[targetPosition]
    const targetIndex = dimension.levels.findIndex((item) => item.key === target.key)
    if (targetIndex < 0) {
      return null
    }

    return {
      target,
      targetId: buildLevelId(level.dimension, target.key),
      targetIndex,
    }
  }

  const canRollLevel = (level: SelectedLevel, direction: -1 | 1): boolean => {
    const target = getHierarchyRollTarget(level, direction)
    if (!target) {
      return false
    }

    return !selectedLevels.some((item) => item.id === target.targetId && item.id !== level.id)
  }

  const rollLevel = (levelId: string, direction: -1 | 1) => {
    const current = selectedLevels.find((item) => item.id === levelId)
    if (!current) {
      return
    }

    const target = getHierarchyRollTarget(current, direction)
    if (!target) {
      return
    }

    const duplicate = selectedLevels.some((item) => item.id === target.targetId && item.id !== current.id)
    if (duplicate) {
      setLastAction('Mức mục tiêu đã tồn tại trong bố cục.')
      return
    }

    setSelectedLevels((previous) =>
      previous.map((item) => {
        if (item.id !== levelId) {
          return item
        }

        return {
          ...item,
          id: target.targetId,
          levelKey: target.target.key,
          levelLabel: target.target.label,
          levelIndex: target.targetIndex,
          levelExpression: target.target.levelExpression,
          hierarchyKey: target.target.hierarchyKey ?? null,
          hierarchyLabel: target.target.hierarchyLabel ?? null,
          hierarchyOrder: target.target.hierarchyOrder ?? null,
        }
      }),
    )

    setDraftFilters((previous) => {
      const next = { ...previous }
      next[target.targetId] = next[levelId] ?? []
      delete next[levelId]
      return next
    })
    setAppliedFilters((previous) => {
      const next = { ...previous }
      next[target.targetId] = next[levelId] ?? []
      delete next[levelId]
      return next
    })
    setOptionsByLevel((previous) => {
      return omitRecordKey(previous, levelId)
    })
    setLastAction(direction > 0 ? 'Đã khoan sâu theo phân cấp.' : 'Đã cuộn lên theo phân cấp.')
  }

  const toggleDimension = (dimension: OlapDimension) => {
    setExpandedDimensions((previous) => ({
      ...previous,
      [dimension]: !(previous[dimension] ?? true),
    }))
  }

  const updateDraftFilter = (levelId: string, values: string[]) => {
    setDraftFilters((previous) => ({
      ...previous,
      [levelId]: values,
    }))
  }

  const applyFilters = () => {
    setAppliedFilters(buildLevelValueMap(selectedLevels, draftFilters))
    setLastAction('Đã áp dụng bộ lọc.')
  }

  const clearFilters = () => {
    const cleared = buildLevelValueMap(selectedLevels)
    setDraftFilters(cleared)
    setAppliedFilters(cleared)
    setLastAction('Đã xóa bộ lọc.')
  }

  const refreshData = () => {
    resetPagination()
    setRefreshToken((previous) => previous + 1)
    setLastAction('Đã làm mới dữ liệu từ khối OLAP.')
  }

  const togglePivot = () => {
    setIsPivoted((previous) => !previous)
    setLastAction('Đã xoay trục bố cục.')
  }

  const resetLayout = () => {
    clearWorkspaceSelections()
    setLastAction('Đã đặt lại bố cục.')
  }

  const loadMoreRows = () => {
    if (!hasMoreRows || isQueryLoading || isLoadingMore || selectedLevels.length === 0) {
      return
    }

    loadMoreScrollYRef.current = window.scrollY
    setRowOffset((previous) => previous + PAGE_SIZE)
    setLastAction(`Đang tải thêm ${PAGE_SIZE} dòng...`)
  }

  return (
    <div className="page-stack">
      <section className="content-card olap-sticky-toolbar">
        <div className="olap-toolbar-grid-singleline">
          <div className="olap-toolbar-group">
            <label htmlFor="cube-select">Khối dữ liệu</label>
            <select
              id="cube-select"
              value={selectedCubeName}
              disabled={cubeOptions.length === 0}
              onChange={(event) => handleCubeChange(event.target.value)}
            >
              {cubeOptions.map((cube) => (
                <option key={cube.value} value={cube.value}>
                  {cube.label}
                </option>
              ))}
            </select>
          </div>

          <div className="olap-toolbar-actions-row">
            <button className="btn-secondary" type="button" onClick={refreshData}>
              Làm mới
            </button>
            <button className="btn-secondary" type="button" onClick={togglePivot}>
              Xoay trục
            </button>
            <button className="btn-secondary" type="button" onClick={resetLayout}>
              Đặt lại bố cục
            </button>
          </div>
        </div>

        {isMetadataLoading || metadataError ? (
          <div className="olap-toolbar-meta-line">
            {isMetadataLoading ? <p className="card-note">Đang tải siêu dữ liệu từ khối OLAP...</p> : null}
            {!isMetadataLoading && metadataError ? <p className="card-note">{metadataError}</p> : null}
          </div>
        ) : null}
      </section>

      <div className="olap-browser-shell-v2">
        <div className="olap-browser-main-v2">
          <section className="content-card">
            <div className="card-header">
              <h3>Bố cục truy vấn</h3>
            </div>

            <div
              className="level-drop-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropLevel}
            >
              {selectedLevels.length === 0 ? (
                <p className="card-note">
                  Kéo mức từ cây chiều dữ liệu vào đây.
                </p>
              ) : (
                <ul className="selected-level-list">
                  {selectedLevels.map((level, index) => (
                    <li
                      className="selected-level-item"
                      draggable
                      key={level.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData(SELECTED_LEVEL_DRAG_MIME, level.id)
                        event.dataTransfer.setData('text/plain', level.id)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        const draggedId = event.dataTransfer.getData(SELECTED_LEVEL_DRAG_MIME)
                          || event.dataTransfer.getData('text/plain')
                        if (!draggedId) {
                          return
                        }
                        reorderSelectedLevels(draggedId, level.id)
                      }}
                    >
                      <div className="selected-level-label">
                        <span className="level-drag-handle">::</span>
                        <span className="dimension-level-role">{index + 1}</span>
                        <span>{level.dimensionLabel} - {level.levelLabel}</span>
                      </div>
                      <div className="selected-level-actions">
                        <button
                          className="btn-secondary axis-mini-btn"
                          disabled={!canRollLevel(level, -1)}
                          onClick={() => rollLevel(level.id, -1)}
                          type="button"
                          title="Cuộn lên"
                        >
                          {'\u2191'}
                        </button>
                        <button
                          className="btn-secondary axis-mini-btn"
                          disabled={!canRollLevel(level, 1)}
                          onClick={() => rollLevel(level.id, 1)}
                          type="button"
                          title="Khoan sâu xuống"
                        >
                          {'\u2193'}
                        </button>
                        <button
                          className="btn-secondary axis-mini-btn"
                          onClick={() => removeLevel(level.id)}
                          type="button"
                          title="Xóa"
                        >
                          {'\u2715'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="card-note">
              
            </p>
          </section>

          <section className="content-card">
            <div className="card-header">
              <h3>Bộ lọc nghiệp vụ</h3>
            </div>

            {selectedLevels.length > 0 ? (
              <div className="filters-grid">
                {selectedLevels.map((level) => (
                  <div className="filter-field" key={level.id}>
                    <label htmlFor={`filter-${level.id}`}>
                      {level.dimensionLabel} - {level.levelLabel}
                    </label>
                    <MultiSelectFilter
                      embedded
                      id={`filter-${level.id}`}
                      label="Chọn bộ lọc"
                      options={optionsByLevel[level.id] ?? []}
                      value={draftFilters[level.id] ?? []}
                      onChange={(next) => updateDraftFilter(level.id, next)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="card-note">Thêm mức vào bố cục truy vấn để bắt đầu lọc dữ liệu.</p>
            )}

            <div className="action-row">
              <button className="btn-secondary" type="button" onClick={applyFilters}>
                Áp dụng bộ lọc
              </button>
              <button className="btn-secondary" type="button" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            </div>

            {isFilterLoading ? <p className="card-note">Đang tải giá trị bộ lọc...</p> : null}
            {!isFilterLoading && filterError ? <p className="card-note">{filterError}</p> : null}
          </section>

          <section className="content-card">
            <div className="card-header">
              <h3>Bảng kết quả OLAP</h3>
            </div>

            {isQueryLoading ? <Loading /> : null}
            {!isQueryLoading && queryError ? <ErrorState message={queryError} /> : null}

            {!isQueryLoading && !queryError ? (
              <>
                {isPivoted && pivotData && pivotData.measureRows.length > 0 ? (
                  <div className="table-wrap">
                    <table className="data-table pivot-grid-table">
                      <thead>
                        {pivotData.levelRows.map((row, rowIndex) => (
                          <tr key={`pivot-row-${rowIndex}`}>
                            <th className="align-center pivot-row-label">{row.label}</th>
                            {row.values.map((value, colIndex) => (
                              <th className="align-center" key={`pivot-head-${rowIndex}-${colIndex}`}>
                                {value}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {pivotData.measureRows.map((measureRow, rowIndex) => (
                          <tr key={`pivot-measure-row-${rowIndex}`}>
                            <td className="align-center pivot-measure-label">{measureRow.label}</td>
                            {measureRow.values.map((value, colIndex) => (
                              <td className="align-center" key={`pivot-value-${rowIndex}-${colIndex}`}>
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : table.columns.length > 0 ? (
                  <DataTable columns={table.columns} rows={table.rows} />
                ) : (
                  <p className="card-note">Không có dữ liệu để hiển thị.</p>
                )}

                {hasMoreRows && !queryError && selectedLevels.length > 0 ? (
                  <div className="olap-see-more-row">
                    <button className="btn-secondary" disabled={isLoadingMore} onClick={loadMoreRows} type="button">
                      {isLoadingMore ? 'Đang tải...' : 'Xem thêm'}
                    </button>
                  </div>
                ) : null}

                <details className="olap-mdx-preview">
                  <summary>MDX đã tạo</summary>
                  <pre>{mdxPreview}</pre>
                </details>
              </>
            ) : null}
          </section>
        </div>

        <aside className="content-card dimension-tree-panel">
          <div className="card-header">
            <h3>Cây chiều dữ liệu</h3>
          </div>

          <section className="dimension-tree-node measure-tree-node">
            <button className="dimension-tree-toggle" type="button">
              <span className="tree-toggle-icon">M</span>
              <span className="dimension-node-label">Độ đo</span>
            </button>
            <ul className="dimension-tree-levels">
              {(selectedCube?.measures ?? []).map((measure) => {
                const active = selectedMeasureKeys.includes(measure.key)
                return (
                  <li className="dimension-tree-level-item" key={`measure-${measure.key}`}>
                    <button
                      className={`dimension-level-drag measure-choice-button ${active ? 'is-selected' : ''}`}
                      onClick={() => toggleMeasureSelection(measure.key)}
                      type="button"
                    >
                      <span className="tree-level-icon">M</span>
                      <span>{measure.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <div className="dimension-tree-list">
            {dimensionsForMeasure.map((dimension) => {
              const isExpanded = expandedDimensions[dimension.key] ?? true
              return (
                <section className="dimension-tree-node" key={dimension.key}>
                  <button
                    className="dimension-tree-toggle"
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleDimension(dimension.key)}
                  >
                    <span className="tree-toggle-icon">{isExpanded ? '-' : '+'}</span>
                    <span className="dimension-node-label">{dimension.label}</span>
                  </button>

                  {isExpanded ? (
                    <ul className="dimension-tree-levels">
                      {dimension.levels.map((level) => {
                        const levelId = buildLevelId(dimension.key, level.key)
                        const placed = selectedLevelIds.has(levelId)
                        const payload: LevelDragPayload = {
                          dimension: dimension.key,
                          dimensionLabel: dimension.label,
                          levelKey: level.key,
                          levelLabel: level.label,
                          levelIndex: dimension.levels.findIndex((item) => item.key === level.key),
                          levelExpression: level.levelExpression,
                          hierarchyKey: level.hierarchyKey ?? null,
                          hierarchyLabel: level.hierarchyLabel ?? null,
                          hierarchyOrder: level.hierarchyOrder ?? null,
                        }

                        return (
                          <li className="dimension-tree-level-item" key={levelId}>
                            <button
                              className={`dimension-level-drag ${placed ? 'is-selected' : ''}`}
                              draggable
                              onClick={() => toggleLevelFromTree(payload)}
                              onDragStart={(event) => {
                                const serialized = JSON.stringify(payload)
                                event.dataTransfer.effectAllowed = 'move'
                                event.dataTransfer.setData(LEVEL_DRAG_MIME, serialized)
                                event.dataTransfer.setData('text/plain', serialized)
                              }}
                              type="button"
                            >
                              <span className="tree-level-icon">+</span>
                              <span>{level.label}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </section>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
