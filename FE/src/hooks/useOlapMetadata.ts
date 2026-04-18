import { useEffect, useState } from 'react'
import { fetchOlapMetadata } from '../api/olapApi'
import type { OlapMetadataResponseDto } from '../types/api'
import type { OlapDimension, OlapMetadata, OlapMeasureMetadata } from '../types/olap'

const KNOWN_DIMENSIONS: OlapDimension[] = ['time', 'store', 'product', 'customer']

function isOlapDimension(value: string): value is OlapDimension {
  return KNOWN_DIMENSIONS.includes(value as OlapDimension)
}

function normalizeMetadata(source: OlapMetadataResponseDto): OlapMetadata {
  const measures: OlapMeasureMetadata[] = source.measures
    .map((measure) => ({
      ...measure,
      dimensions: measure.dimensions
        .filter((dimension) => isOlapDimension(dimension.key))
        .map((dimension) => ({
          ...dimension,
          key: dimension.key as OlapDimension,
          levels: (dimension.levels ?? []).filter((level) => Boolean(level.levelExpression)),
        }))
        .filter((dimension) => dimension.levels.length > 0),
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
