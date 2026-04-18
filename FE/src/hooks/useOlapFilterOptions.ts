import { useEffect, useState } from 'react'
import { executeOlapQuery } from '../api/olapApi'
import type { SelectOption } from '../types/filter'
import type { OlapDimension } from '../types/olap'
import { OLAP_LEVEL_OPTIONS } from '../types/olap'

interface OlapFilterOptions {
  time: SelectOption[]
  store: SelectOption[]
  product: SelectOption[]
  customer: SelectOption[]
}

interface UseOlapFilterOptionsInput {
  measure: string
  dimensions: OlapDimension[]
  levels: Record<OlapDimension, number>
}

type CubeType = 'banhang' | 'tonkho'
type FilterKey = keyof OlapFilterOptions

const EMPTY_OPTIONS: OlapFilterOptions = {
  time: [],
  store: [],
  product: [],
  customer: [],
}

const TIME_HIERARCHIES = [
  '[Dim Thoi Gian].[Nam].[Nam]',
  '[Dim Thoi Gian].[Quy].[Quy]',
  '[Dim Thoi Gian].[Thang].[Thang]',
] as const

function cubeTypeForMeasure(measure: string): CubeType {
  return measure === 'inventory' ? 'tonkho' : 'banhang'
}

function cubeNameForType(cubeType: CubeType): string {
  return cubeType === 'tonkho' ? 'CubeTonKho' : 'CubeBanHang'
}

function normalizeLevelIndex(dimension: OlapDimension, levelIndex: number): number {
  const max = OLAP_LEVEL_OPTIONS[dimension].length - 1
  return Math.max(0, Math.min(levelIndex, max))
}

function resolveHierarchy(
  cubeType: CubeType,
  dimension: OlapDimension,
  levelIndex: number,
): string | null {
  const normalizedIndex = normalizeLevelIndex(dimension, levelIndex)
  if (dimension === 'time') {
    return TIME_HIERARCHIES[normalizedIndex]
  }

  if (dimension === 'product') {
    return '[Dim Mat Hang].[Ma Mat Hang].[Ma Mat Hang]'
  }

  if (cubeType === 'banhang') {
    if (dimension === 'customer') {
      return normalizedIndex === 0
        ? '[Dim Khach Hang].[Ten Thanh Pho].[Ten Thanh Pho]'
        : '[Dim Khach Hang].[Ten Khach Hang].[Ten Khach Hang]'
    }

    return null
  }

  if (dimension === 'store') {
    if (normalizedIndex === 0) {
      return '[Dim Cua Hang].[Bang].[Bang]'
    }

    if (normalizedIndex === 1) {
      return '[Dim Cua Hang].[Ten Thanh Pho].[Ten Thanh Pho]'
    }

    return '[Dim Cua Hang].[Ma Cua Hang].[Ma Cua Hang]'
  }

  return null
}

function parseMemberKey(raw: string): string {
  const keyMatches = [...raw.matchAll(/&\[([^\]]+)\]/g)]
  if (keyMatches.length > 0) {
    return keyMatches[keyMatches.length - 1][1].trim()
  }

  const bracketMatches = [...raw.matchAll(/\[([^\]]+)\]/g)]
  if (bracketMatches.length > 0) {
    return bracketMatches[bracketMatches.length - 1][1].trim()
  }

  return raw.trim()
}

function parseMemberKeys(raw: string): string[] {
  return [...raw.matchAll(/&\[([^\]]+)\]/g)].map((match) => match[1].trim())
}

function resolveMemberColumns(columns: string[]): { captionColumn: string; uniqueColumn: string } {
  const firstColumn = columns[0] ?? ''
  const captionColumn = columns.find((column) => column.includes('[MEMBER_CAPTION]')) ?? firstColumn
  const uniqueColumn = columns.find((column) => column.includes('[MEMBER_UNIQUE_NAME]')) ?? captionColumn
  return { captionColumn, uniqueColumn }
}

function formatMemberLabel(
  caption: string,
  uniqueName: string,
  dimension: OlapDimension,
  levelIndex: number,
): string {
  if (dimension !== 'time') {
    return caption
  }

  const keys = parseMemberKeys(uniqueName)
  const normalizedIndex = normalizeLevelIndex(dimension, levelIndex)
  if (normalizedIndex === 0 && keys.length >= 1) {
    return keys[keys.length - 1]
  }

  if (normalizedIndex === 1) {
    if (keys.length >= 2) {
      return `${keys[keys.length - 2]} - Q${keys[keys.length - 1]}`
    }

    return caption.startsWith('Q') ? caption.toUpperCase() : `Q${caption}`
  }

  if (normalizedIndex === 2) {
    if (keys.length >= 2) {
      return `${keys[keys.length - 2]} - Thang ${keys[keys.length - 1]}`
    }

    return caption.startsWith('Thang ') ? caption : `Thang ${caption}`
  }

  return caption
}

function toOptionValue(captionRaw: string, uniqueRaw: string): string {
  if (uniqueRaw.startsWith('[')) {
    return uniqueRaw
  }

  return parseMemberKey(uniqueRaw || captionRaw)
}

function toTimeSortTuple(optionValue: string): [number, number] {
  const keys = parseMemberKeys(optionValue)
  const year = Number(keys[keys.length - 2] ?? keys[keys.length - 1] ?? 0)
  const sub = Number(keys[keys.length - 1] ?? 0)
  return [year, sub]
}

function toSelectOptions(
  result: { columns: string[]; rows: Record<string, string>[] },
  dimension: OlapDimension,
  levelIndex: number,
): SelectOption[] {
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

    const labelSource = captionRaw || parseMemberKey(uniqueRaw)

    seen.add(value)
    options.push({
      label: formatMemberLabel(labelSource, uniqueRaw, dimension, levelIndex),
      value,
    })
  })

  if (dimension === 'time') {
    const normalizedLevel = normalizeLevelIndex(dimension, levelIndex)
    if (normalizedLevel === 0) {
      return options.sort((a, b) => Number(b.label) - Number(a.label))
    }

    if (normalizedLevel === 1 || normalizedLevel === 2) {
      return options.sort((a, b) => {
        const [yearA, subA] = toTimeSortTuple(a.value)
        const [yearB, subB] = toTimeSortTuple(b.value)
        if (yearA !== yearB) {
          return yearB - yearA
        }

        return subA - subB
      })
    }
  }

  return options
}

function membersQuery(cube: string, hierarchy: string, limit: number): string {
  return [
    'SELECT {[Measures].DefaultMember} ON COLUMNS,',
    `NON EMPTY HEAD(${hierarchy}.MEMBERS, ${limit}) DIMENSION PROPERTIES MEMBER_CAPTION, MEMBER_UNIQUE_NAME ON ROWS`,
    `FROM [${cube}]`,
  ].join(' ')
}

function optionLimitFor(dimension: OlapDimension): number {
  if (dimension === 'time') {
    return 120
  }

  return 220
}

export function useOlapFilterOptions(input: UseOlapFilterOptionsInput) {
  const [options, setOptions] = useState<OlapFilterOptions>(EMPTY_OPTIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const cubeType = cubeTypeForMeasure(input.measure)
        const cubeName = cubeNameForType(cubeType)
        const targets = input.dimensions as FilterKey[]

        const responses = await Promise.all(
          targets.map(async (dimension) => {
            const levelIndex = normalizeLevelIndex(dimension, input.levels[dimension])
            const hierarchy = resolveHierarchy(cubeType, dimension, levelIndex)
            if (!hierarchy) {
              return { dimension, nextOptions: [] as SelectOption[] }
            }

            const result = await executeOlapQuery(
              cubeName,
              membersQuery(
                cubeName,
                hierarchy,
                optionLimitFor(dimension),
              ),
            )

            return {
              dimension,
              nextOptions: toSelectOptions(result, dimension, levelIndex),
            }
          }),
        )

        if (!isActive) {
          return
        }

        const next: OlapFilterOptions = {
          ...EMPTY_OPTIONS,
        }

        responses.forEach((item) => {
          next[item.dimension] = item.nextOptions
        })
        setOptions(next)
      } catch (err) {
        if (!isActive) {
          return
        }

        const message = err instanceof Error ? err.message : 'Khong the tai bo loc tu cube.'
        setError(message)
        setOptions(EMPTY_OPTIONS)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      isActive = false
    }
  }, [input.dimensions, input.levels, input.measure])

  return {
    options,
    isLoading,
    error,
  }
}
