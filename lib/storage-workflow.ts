export async function withObjectCompensation<T>(
  objectKey: string,
  persist: () => Promise<T>,
  removeObject: (key: string) => Promise<void>,
) {
  try {
    return await persist();
  } catch (error) {
    try {
      await removeObject(objectKey);
    } catch (compensationError) {
      console.error("MinIO compensation failed", { objectKey, compensationError });
    }
    throw error;
  }
}
