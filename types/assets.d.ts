/**
 * Metro turns an imported image into an asset id at bundle time; TypeScript needs telling, because
 * Expo SDK 57 no longer ships a declaration for image modules. Without this, `import icon from
 * '@/assets/images/icon.png'` is a compile error even though the bundler resolves it fine.
 */
declare module '*.png' {
  /** The registered asset's id, which is what `Image`'s `source` takes. */
  const asset: number;
  export default asset;
}
