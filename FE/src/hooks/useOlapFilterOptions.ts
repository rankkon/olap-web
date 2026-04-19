import { useEffect, useState } from 'react'
import { executeOlapQuery } from '../api/olapApi'
import type { SelectOption } from '../types/filter'
import type { OlapDimension, OlapMeasureMetadata } from '../types/olap'

interface OlapFilterOptions {
  time: SelectOption[]
  store: SelectOption[]
  product: SelectOption[]
  customer: SelectOption[]
}

interface UseOlapFilterOptionsInput {
  measureMetadata?: OlapMeasureMetadata | null
  dimensions: OlapDimension[]
  levels: Record<OlapDimension, number>
  reloadToken?: number
}

type FilterKey = keyof OlapFilterOptions

const EMPTY_OPTIONS: OlapFilterOptions = {
  time: [],
  store: [],
  product: [],
  customer: [],
}

function normalizeLevelIndex(levelCount: number, levelIndex: number): number {
  const max = Math.max(levelCount - 1, 0)
  return Math.max(0, Math.min(levelIndex, max))
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
  const normalizedIndex = normalizeLevelIndex(3, levelIndex)
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
    const normalizedLevel = normalizeLevelIndex(3, levelIndex)
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
        if (!input.measureMetadata) {
          setOptions(EMPTY_OPTIONS)
          return
        }

        const cubeName = input.measureMetadata.cubeName
        const targets = input.dimensions as FilterKey[]

        const responses = await Promise.all(
          targets.map(async (dimension) => {
            const dimensionMeta = input.measureMetadata?.dimensions.find((item) => item.key === dimension)
            if (!dimensionMeta || dimensionMeta.levels.length === 0) {
              return { dimension, nextOptions: [] as SelectOption[] }
            }

            const levelIndex = normalizeLevelIndex(dimensionMeta.levels.length, input.levels[dimension])
            const hierarchy = dimensionMeta.levels[levelIndex]?.levelExpression
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
  }, [input.dimensions, input.levels, input.measureMetadata, input.reloadToken])

  return {
    options,
    isLoading,
    error,
  }
}
