import { useEffect, useState } from 'react'
import { fetchOlapMetadata } from '../api/olapApi'
import type { OlapMetadataResponseDto } from '../types/api'
import type { OlapDimension, OlapLevelMetadata, OlapMetadata, OlapMeasureMetadata } from '../types/olap'

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupeLevels(levels: OlapLevelMetadata[]): OlapLevelMetadata[] {
  const uniqueByExpression = new Map<string, OlapLevelMetadata>()
  levels.forEach((level) => {
    const expression = level.levelExpression?.trim()
    if (!expression) {
      return
    }

    const expressionKey = expression.toLowerCase()
    if (!uniqueByExpression.has(expressionKey)) {
      uniqueByExpression.set(expressionKey, level)
    }
  })

  const byExpression = Array.from(uniqueByExpression.values())
  if (byExpression.length <= 1) {
    return byExpression
  }

  const hierarchySizeByKey = new Map<string, number>()
  byExpression.forEach((level) => {
    const hierarchyKey = level.hierarchyKey?.trim().toLowerCase()
    if (!hierarchyKey) {
      return
    }

    hierarchySizeByKey.set(hierarchyKey, (hierarchySizeByKey.get(hierarchyKey) ?? 0) + 1)
  })

  const rankedByLabel = new Map<
    string,
    {
      level: OlapLevelMetadata
      position: number
      score: number
    }
  >()

  byExpression.forEach((level, index) => {
    const labelKey = normalizeLabel(level.label || level.key || level.levelExpression)
    const hierarchyKey = level.hierarchyKey?.trim().toLowerCase()
    const hierarchySize = hierarchyKey ? (hierarchySizeByKey.get(hierarchyKey) ?? 0) : 0
    const hierarchyLabel = (level.hierarchyLabel ?? '').toLowerCase()

    let score = 0
    if (typeof level.hierarchyOrder === 'number') {
      score += 2
    }
    if (hierarchySize > 1) {
      score += 4
    }
    if (hierarchyLabel.includes('hierarchy') || hierarchyLabel.startsWith('h_')) {
      score += 1
    }

    const existing = rankedByLabel.get(labelKey)
    if (!existing) {
      rankedByLabel.set(labelKey, {
        level,
        position: index,
        score,
      })
      return
    }

    if (score > existing.score) {
      rankedByLabel.set(labelKey, {
        level,
        position: existing.position,
        score,
      })
    }
  })

  return Array.from(rankedByLabel.values())
    .sort((left, right) => left.position - right.position)
    .map((item) => item.level)
}

function mergeAndNormalizeDimensions(measure: OlapMetadataResponseDto['measures'][number]) {
  const dimensionMap = new Map<string, OlapMeasureMetadata['dimensions'][number]>()

  measure.dimensions.forEach((dimension) => {
    const dimensionKey = dimension.key?.trim()
    if (!dimensionKey) {
      return
    }

    const existing = dimensionMap.get(dimensionKey)
    if (!existing) {
      dimensionMap.set(dimensionKey, {
        ...dimension,
        key: dimensionKey as OlapDimension,
        levels: [],
      })
    }

    const target = dimensionMap.get(dimensionKey)
    if (!target) {
      return
    }

    target.levels.push(...(dimension.levels ?? []).filter((level) => Boolean(level.levelExpression)))
  })

  return Array.from(dimensionMap.values())
    .map((dimension) => ({
      ...dimension,
      levels: dedupeLevels(dimension.levels),
    }))
    .filter((dimension) => dimension.levels.length > 0)
}

function normalizeMetadata(source: OlapMetadataResponseDto): OlapMetadata {
  const measures: OlapMeasureMetadata[] = source.measures
    .map((measure) => ({
      ...measure,
      dimensions: mergeAndNormalizeDimensions(measure),
    }))
    .filter((measure) => measure.dimensions.length > 0)

  return {
    measures,
  }
}

const EMPTY_METADATA: OlapMetadata = {
  measures: [],
}

export function useOlapMetadata() {
  const [metadata, setMetadata] = useState<OlapMetadata>(EMPTY_METADATA)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchOlapMetadata()
        if (!isActive) {
          return
        }

        setMetadata(normalizeMetadata(response))
      } catch (err) {
        if (!isActive) {
          return
        }

        const message = err instanceof Error ? err.message : 'Khong the tai metadata OLAP tu backend.'
        setError(message)
        setMetadata(EMPTY_METADATA)
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
  }, [])

  return {
    metadata,
    isLoading,
    error,
  }
}
