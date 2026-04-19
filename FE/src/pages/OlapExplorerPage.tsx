import { useEffect, useMemo, useState } from 'react'
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
}

interface LevelDragPayload {
  dimension: OlapDimension
  dimensionLabel: string
  levelKey: string
  levelLabel: string
  levelIndex: number
  levelExpression: string
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
  measureLabel: string
  measureValues: string[]
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

function rowLimitForLevelCount(levelCount: number): number {
  if (levelCount >= 3) {
    return 1200
  }

  if (levelCount === 2) {
    return 2400
  }

  return 5000
}

function buildLevelId(dimension: OlapDimension, levelKey: string): string {
  return `${dimension}::${levelKey}`
}

function formatCubeLabel(cubeType: string, cubeName: string): string {
  const normalized = cubeType.trim().toLowerCase()
  if (normalized === 'banhang') {
    return `Ban hang (${cubeName})`
  }

  if (normalized === 'tonkho') {
    return `Ton kho (${cubeName})`
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

function membersQuery(cubeName: string, levelExpression: string, limit: number): string {
  return [
    'SELECT {[Measures].DefaultMember} ON COLUMNS,',
    `NON EMPTY HEAD(${levelExpression}.MEMBERS, ${limit}) DIMENSION PROPERTIES MEMBER_CAPTION, MEMBER_UNIQUE_NAME ON ROWS`,
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
  measureExpression: string,
  cubeName: string,
  selectedLevels: SelectedLevel[],
  appliedFilters: Record<string, string[]>,
): string {
  if (selectedLevels.length === 0) {
    return [
      `SELECT { ${measureExpression} } ON COLUMNS`,
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
  const limitedRows = `HEAD(NONEMPTY(${combinedSet}, { ${measureExpression} }), ${rowLimitForLevelCount(selectedLevels.length)})`
  return [
    'SELECT',
    `  { ${measureExpression} } ON COLUMNS,`,
    `  ${limitedRows} DIMENSION PROPERTIES MEMBER_CAPTION, MEMBER_UNIQUE_NAME ON ROWS`,
    `FROM [${escapeMdxIdentifier(cubeName)}]`,
  ].join('\n')
}

function normalizeFlatTable(
  result: QueryResultDto,
  selectedLevels: SelectedLevel[],
  measureLabel: string,
): DisplayTable {
  const captionColumns = result.columns.filter((column) => column.includes('[MEMBER_CAPTION]'))
  const uniqueColumns = new Set(result.columns.filter((column) => column.includes('[MEMBER_UNIQUE_NAME]')))
  const valueColumns = result.columns.filter(
    (column) => !column.includes('[MEMBER_CAPTION]') && !column.includes('[MEMBER_UNIQUE_NAME]'),
  )

  if (selectedLevels.length === 0) {
    const firstValueColumn = valueColumns[0] ?? result.columns.find((column) => !uniqueColumns.has(column)) ?? ''
    const rawValue = result.rows[0]?.[firstValueColumn] ?? '0'

    return {
      columns: [
        {
          key: 'measure',
          label: measureLabel,
          align: 'center',
        },
      ],
      rows: [
        {
          measure: formatMeasureValue(rawValue),
        },
      ],
      total: tryParseNumber(rawValue) ?? 0,
    }
  }

  const columns: TableColumn[] = []

  captionColumns.forEach((_, index) => {
    const selectedLevel = selectedLevels[index]
    columns.push({
      key: `level_${index}`,
      label: selectedLevel
        ? `${selectedLevel.dimensionLabel} - ${selectedLevel.levelLabel}`
        : `Level ${index + 1}`,
      align: 'center',
    })
  })

  valueColumns.forEach((_column, index) => {
    columns.push({
      key: `value_${index}`,
      label: index === 0 ? measureLabel : `Measure ${index + 1}`,
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
  measureLabel: string,
): PivotRenderData {
  const levelRows = selectedLevels.map((level, levelIndex) => ({
    label: `${level.dimensionLabel} - ${level.levelLabel}`,
    values: table.rows.map((row) => String(row[`level_${levelIndex}`] ?? '-')),
  }))

  const measureValues = table.rows.map((row) => String(row.value_0 ?? '-'))

  return {
    levelRows,
    measureLabel,
    measureValues,
  }
}

function activeFilterCount(selectedLevels: SelectedLevel[], appliedFilters: Record<string, string[]>): number {
  return selectedLevels.reduce((count, level) => {
    if ((appliedFilters[level.id] ?? []).length > 0) {
      return count + 1
    }

    return count
  }, 0)
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
    }
  } catch {
    return null
  }
}

export default function OlapExplorerPage() {
  const [selectedCubeName, setSelectedCubeName] = useState('')
  const [selectedMeasureKey, setSelectedMeasureKey] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<SelectedLevel[]>([])
  const [expandedDimensions, setExpandedDimensions] = useState<Partial<Record<OlapDimension, boolean>>>({})
  const [isPivoted, setIsPivoted] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [lastAction, setLastAction] = useState('Workspace ready')
  const [mdxPreview, setMdxPreview] = useState('')

  const [draftFilters, setDraftFilters] = useState<Record<string, string[]>>({})
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({})
  const [optionsByLevel, setOptionsByLevel] = useState<Record<string, SelectOption[]>>({})
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)

  const [table, setTable] = useState<DisplayTable>(EMPTY_TABLE)
  const [pivotData, setPivotData] = useState<PivotRenderData | null>(null)
  const [isQueryLoading, setIsQueryLoading] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  const {
    metadata,
    isLoading: isMetadataLoading,
    error: metadataError,
  } = useOlapMetadata()

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

  const selectedMeasure = useMemo(
    () => selectedCube?.measures.find((measure) => measure.key === selectedMeasureKey) ?? null,
    [selectedCube, selectedMeasureKey],
  )

  const dimensionsForMeasure = selectedMeasure?.dimensions ?? []

  useEffect(() => {
    if (!selectedMeasure) {
      setSelectedLevels([])
      return
    }

    const allowedDimensions = new Set(dimensionsForMeasure.map((dimension) => dimension.key))
    setSelectedLevels((previous) => previous.filter((level) => allowedDimensions.has(level.dimension)))
  }, [dimensionsForMeasure, selectedMeasure])

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
    setDraftFilters((previous) => {
      const next: Record<string, string[]> = {}
      selectedLevels.forEach((level) => {
        next[level.id] = previous[level.id] ?? []
      })
      return next
    })

    setAppliedFilters((previous) => {
      const next: Record<string, string[]> = {}
      selectedLevels.forEach((level) => {
        next[level.id] = previous[level.id] ?? []
      })
      return next
    })
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
              membersQuery(selectedMeasure.cubeName, level.levelExpression, 260),
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

        const message = error instanceof Error ? error.message : 'Khong the tai members cho bo loc.'
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
    let isActive = true

    const run = async () => {
      if (!selectedMeasure) {
        setTable(EMPTY_TABLE)
        setPivotData(null)
        setQueryError(null)
        setIsQueryLoading(false)
        return
      }

      setIsQueryLoading(true)
      setQueryError(null)

      try {
        const mdx = buildExplorerMdx(
          selectedMeasure.measureExpression,
          selectedMeasure.cubeName,
          selectedLevels,
          appliedFilters,
        )

        setMdxPreview(mdx)
        const queryResult = await executeOlapQuery(selectedMeasure.cubeName, mdx)

        if (!isActive) {
          return
        }

        const normalized = normalizeFlatTable(queryResult, selectedLevels, selectedMeasure.label)
        setTable(normalized)
        setPivotData(
          selectedLevels.length > 0
            ? toPivotRenderData(normalized, selectedLevels, selectedMeasure.label)
            : null,
        )
      } catch (error) {
        if (!isActive) {
          return
        }

        const message = error instanceof Error ? error.message : 'Khong the lay du lieu tu cube.'
        setQueryError(message)
        setTable(EMPTY_TABLE)
        setPivotData(null)
      } finally {
        if (isActive) {
          setIsQueryLoading(false)
        }
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [appliedFilters, refreshToken, selectedLevels, selectedMeasure])

  const selectedLevelIds = useMemo(
    () => new Set(selectedLevels.map((level) => level.id)),
    [selectedLevels],
  )

  const breadcrumb = useMemo(() => {
    if (!selectedMeasure) {
      return 'Chua co measure.'
    }

    if (selectedLevels.length === 0) {
      return `0D | Measure: ${selectedMeasure.label}`
    }

    const levelPath = selectedLevels
      .map((level) => `${level.dimensionLabel}.${level.levelLabel}`)
      .join(' > ')

    return `${isPivoted ? 'Pivot mode' : 'Tabular mode'} | ${levelPath}`
  }, [isPivoted, selectedLevels, selectedMeasure])

  const appliedFilterTotal = useMemo(
    () => activeFilterCount(selectedLevels, appliedFilters),
    [appliedFilters, selectedLevels],
  )

  const handleCubeChange = (nextCubeName: string) => {
    const nextCube = cubeOptions.find((cube) => cube.value === nextCubeName)
    if (!nextCube || nextCube.measures.length === 0) {
      return
    }

    setSelectedCubeName(nextCubeName)
    setSelectedMeasureKey(nextCube.measures[0].key)
    setSelectedLevels([])
    setExpandedDimensions({})
    setDraftFilters({})
    setAppliedFilters({})
    setOptionsByLevel({})
    setIsPivoted(false)
    setLastAction(`Da chuyen cube: ${nextCubeName}`)
  }

  const handleMeasureChange = (nextMeasure: string) => {
    setSelectedMeasureKey(nextMeasure)
    setSelectedLevels([])
    setExpandedDimensions({})
    setDraftFilters({})
    setAppliedFilters({})
    setOptionsByLevel({})
    setIsPivoted(false)
    setLastAction('Da doi measure.')
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

    const nextLevel: SelectedLevel = {
      id: buildLevelId(payload.dimension, payload.levelKey),
      dimension: payload.dimension,
      dimensionLabel: payload.dimensionLabel,
      levelKey: payload.levelKey,
      levelLabel: payload.levelLabel,
      levelIndex: payload.levelIndex,
      levelExpression: payload.levelExpression,
    }

    if (selectedLevelIds.has(nextLevel.id)) {
      setLastAction('Level da ton tai trong layout.')
      return
    }

    const allowedDimensions = new Set(dimensionsForMeasure.map((dimension) => dimension.key))
    if (!allowedDimensions.has(nextLevel.dimension)) {
      setLastAction('Level khong thuoc measure hien tai.')
      return
    }

    setSelectedLevels((previous) => [...previous, nextLevel])
    setLastAction(`Da them level ${nextLevel.dimensionLabel} - ${nextLevel.levelLabel}.`)
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
    setLastAction('Da sap xep lai thu tu level.')
  }

  const removeLevel = (levelId: string) => {
    setSelectedLevels((previous) => previous.filter((level) => level.id !== levelId))
    setDraftFilters((previous) => {
      const next = { ...previous }
      delete next[levelId]
      return next
    })
    setAppliedFilters((previous) => {
      const next = { ...previous }
      delete next[levelId]
      return next
    })
    setOptionsByLevel((previous) => {
      const next = { ...previous }
      delete next[levelId]
      return next
    })
    setLastAction('Da xoa level khoi layout.')
  }

  const rollLevel = (levelId: string, direction: -1 | 1) => {
    const current = selectedLevels.find((item) => item.id === levelId)
    if (!current) {
      return
    }

    const dimension = dimensionsForMeasure.find((item) => item.key === current.dimension)
    if (!dimension) {
      return
    }

    const nextIndex = current.levelIndex + direction
    if (nextIndex < 0 || nextIndex >= dimension.levels.length) {
      return
    }

    const nextLevel = dimension.levels[nextIndex]
    const nextId = buildLevelId(current.dimension, nextLevel.key)
    const duplicate = selectedLevels.some((item) => item.id === nextId && item.id !== current.id)
    if (duplicate) {
      setLastAction('Level muc tieu da ton tai trong layout.')
      return
    }

    setSelectedLevels((previous) =>
      previous.map((item) => {
        if (item.id !== levelId) {
          return item
        }

        return {
          ...item,
          id: nextId,
          levelKey: nextLevel.key,
          levelLabel: nextLevel.label,
          levelIndex: nextIndex,
          levelExpression: nextLevel.levelExpression,
        }
      }),
    )

    setDraftFilters((previous) => {
      const next = { ...previous }
      next[nextId] = next[levelId] ?? []
      delete next[levelId]
      return next
    })
    setAppliedFilters((previous) => {
      const next = { ...previous }
      next[nextId] = next[levelId] ?? []
      delete next[levelId]
      return next
    })
    setOptionsByLevel((previous) => {
      const next = { ...previous }
      delete next[levelId]
      return next
    })
    setLastAction(direction > 0 ? 'Da drill down level.' : 'Da roll up level.')
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
    const nextApplied: Record<string, string[]> = {}
    selectedLevels.forEach((level) => {
      nextApplied[level.id] = [...(draftFilters[level.id] ?? [])]
    })

    setAppliedFilters(nextApplied)
    setLastAction('Da ap dung bo loc.')
  }

  const clearFilters = () => {
    const cleared: Record<string, string[]> = {}
    selectedLevels.forEach((level) => {
      cleared[level.id] = []
    })

    setDraftFilters(cleared)
    setAppliedFilters(cleared)
    setLastAction('Da xoa bo loc.')
  }

  const refreshData = () => {
    setRefreshToken((previous) => previous + 1)
    setLastAction('Da refresh du lieu tu cube.')
  }

  const togglePivot = () => {
    setIsPivoted((previous) => !previous)
    setLastAction('Da pivot layout.')
  }

  const resetLayout = () => {
    setSelectedLevels([])
    setDraftFilters({})
    setAppliedFilters({})
    setOptionsByLevel({})
    setIsPivoted(false)
    setLastAction('Da reset layout.')
  }

  return (
    <div className="page-stack">
      <section className="content-card olap-sticky-toolbar">
        <div className="olap-toolbar-grid-singleline">
          <div className="olap-toolbar-group">
            <label htmlFor="cube-select">Cube</label>
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

          <div className="olap-toolbar-group">
            <label htmlFor="measure-select">Measure</label>
            <select
              id="measure-select"
              value={selectedMeasureKey}
              disabled={!selectedCube || selectedCube.measures.length === 0}
              onChange={(event) => handleMeasureChange(event.target.value)}
            >
              {(selectedCube?.measures ?? []).map((measure) => (
                <option key={measure.key} value={measure.key}>
                  {measure.label}
                </option>
              ))}
            </select>
          </div>

          <div className="olap-toolbar-actions-row">
            <button className="btn-secondary" type="button" onClick={refreshData}>
              Refresh
            </button>
            <button className="btn-secondary" type="button" onClick={togglePivot}>
              Pivot
            </button>
            <button className="btn-secondary" type="button" onClick={resetLayout}>
              Reset layout
            </button>
          </div>
        </div>

        <div className="olap-toolbar-meta-line">
          <p className="olap-breadcrumb-value">{breadcrumb}</p>
          <span className="badge-note">Active filters: {appliedFilterTotal}</span>
          <span className="badge-note">Rows: {table.rows.length}</span>
          <span className="badge-note">Total: {formatNumber(table.total)}</span>
        </div>

        <div className="olap-toolbar-meta-line">
          <p className="card-note">Last action: {lastAction}</p>
          {isMetadataLoading ? <p className="card-note">Dang tai metadata tu cube...</p> : null}
          {!isMetadataLoading && metadataError ? <p className="card-note">{metadataError}</p> : null}
        </div>
      </section>

      <div className="olap-browser-shell-v2">
        <div className="olap-browser-main-v2">
          <section className="content-card">
            <div className="card-header">
              <h3>Workspace layout</h3>
            </div>

            <div
              className="level-drop-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropLevel}
            >
              {selectedLevels.length === 0 ? (
                <p className="card-note">
                  Keo level tu Dimension Tree vao day. Neu khong chon level nao, bang se hien tong measure (0 chieu).
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
                          disabled={level.levelIndex <= 0}
                          onClick={() => rollLevel(level.id, -1)}
                          type="button"
                          title="Roll up"
                        >
                          {'\u2191'}
                        </button>
                        <button
                          className="btn-secondary axis-mini-btn"
                          disabled={
                            level.levelIndex >= (
                              dimensionsForMeasure.find((item) => item.key === level.dimension)?.levels.length ?? 1
                            ) - 1
                          }
                          onClick={() => rollLevel(level.id, 1)}
                          type="button"
                          title="Drill down"
                        >
                          {'\u2193'}
                        </button>
                        <button
                          className="btn-secondary axis-mini-btn"
                          onClick={() => removeLevel(level.id)}
                          type="button"
                          title="Remove"
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
              Tabular mode: level tren cot, ban ghi tren dong. Pivot mode: xoay level sang truc cot de so sanh nhanh.
            </p>
          </section>

          <section className="content-card">
            <div className="card-header">
              <h3>Bo loc nghiep vu</h3>
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
                      label="Select members"
                      options={optionsByLevel[level.id] ?? []}
                      value={draftFilters[level.id] ?? []}
                      onChange={(next) => updateDraftFilter(level.id, next)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="card-note">Them level vao workspace de bat dau loc du lieu.</p>
            )}

            <div className="action-row">
              <button className="btn-secondary" type="button" onClick={applyFilters}>
                Apply filter
              </button>
              <button className="btn-secondary" type="button" onClick={clearFilters}>
                Clear filter
              </button>
            </div>

            {isFilterLoading ? <p className="card-note">Dang tai members...</p> : null}
            {!isFilterLoading && filterError ? <p className="card-note">{filterError}</p> : null}
          </section>

          <section className="content-card">
            <div className="card-header">
              <h3>Bang ket qua OLAP</h3>
              <span className="badge-note">{isPivoted ? 'Pivot mode' : 'Tabular mode'}</span>
            </div>

            {isQueryLoading ? <Loading /> : null}
            {!isQueryLoading && queryError ? <ErrorState message={queryError} /> : null}

            {!isQueryLoading && !queryError ? (
              <>
                {isPivoted && pivotData && pivotData.measureValues.length > 0 ? (
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
                        <tr>
                          <td className="align-center pivot-measure-label">{pivotData.measureLabel}</td>
                          {pivotData.measureValues.map((value, colIndex) => (
                            <td className="align-center" key={`pivot-value-${colIndex}`}>
                              {value}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : table.columns.length > 0 ? (
                  <DataTable columns={table.columns} rows={table.rows} />
                ) : (
                  <p className="card-note">Khong co du lieu de hien thi.</p>
                )}

                <details className="olap-mdx-preview">
                  <summary>MDX generated</summary>
                  <pre>{mdxPreview}</pre>
                </details>
              </>
            ) : null}
          </section>
        </div>

        <aside className="content-card dimension-tree-panel">
          <div className="card-header">
            <h3>Dimension Tree</h3>
          </div>

          <p className="card-note">
            Expand dimension, keo level vao Workspace layout. Co the keo nhieu level cua cung mot dimension.
          </p>

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
                        }

                        return (
                          <li className="dimension-tree-level-item" key={levelId}>
                            <button
                              className={`dimension-level-drag ${placed ? 'is-selected' : ''}`}
                              draggable
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
