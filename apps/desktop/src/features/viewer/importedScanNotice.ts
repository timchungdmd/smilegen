interface ImportedScanNoticeInput {
  previousSignature: string | null;
  nextSignature: string | null;
  isAlignmentMode: boolean;
}

export function shouldShowImportedScanNotice({
  previousSignature,
  nextSignature,
  isAlignmentMode,
}: ImportedScanNoticeInput): boolean {
  if (isAlignmentMode || nextSignature === null) {
    return false;
  }

  return previousSignature !== null && previousSignature !== nextSignature;
}

export function getImportedScanNoticeLabel(name: string): string {
  return `Scan loaded: ${name}. View reset.`;
}
