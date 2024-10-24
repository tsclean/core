import { ExceptionFilterMetadataInterface } from '../contracts'

export const selectExceptionFilterMetadata = <T = any>(
  filters: ExceptionFilterMetadataInterface[],
  exception: T
): ExceptionFilterMetadataInterface | undefined =>
  filters.find(
    ({ exceptionMetaTypes }) =>
      !exceptionMetaTypes.length ||
      exceptionMetaTypes.some(
        ExceptionMetaType => exception instanceof ExceptionMetaType
      )
  )
