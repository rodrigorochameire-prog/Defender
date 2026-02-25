// ===== Drive Hub + File Manager (Redesign) =====
export { DriveProvider, useDriveContext, type BreadcrumbItem, type DriveFilters } from "./DriveContext";
export { DriveSidebar } from "./DriveSidebar";
export { DriveTopBar } from "./DriveTopBar";
export { DriveBreadcrumbs } from "./DriveBreadcrumbs";
export { DriveContentArea } from "./DriveContentArea";
export { DriveFileGrid } from "./DriveFileGrid";
export { DriveFileList } from "./DriveFileList";
export { DriveFilters as DriveFiltersComponent } from "./DriveFilters";
export { DriveBatchActions } from "./DriveBatchActions";
export { DriveOverviewDashboard } from "./DriveOverviewDashboard";
export { DriveDetailPanel } from "./DriveDetailPanel";
export { DriveCommandPalette } from "./DriveCommandPalette";
export { DriveDropZone } from "./DriveDropZone";
export { useKeyboardShortcuts } from "./useKeyboardShortcuts";

// Constants & Utilities
export {
  DRIVE_ATRIBUICOES, SPECIAL_FOLDERS, FILE_ICON_MAP,
  getFileIcon, getFileTypeLabel, formatFileSize, getEnrichmentBadge,
  getAtribuicaoByKey, getAtribuicaoFolderId,
} from "./drive-constants";

// ===== Legacy Components (still used in assistido/processo pages) =====
export { FileUploadWithLink } from "./FileUploadWithLink";
export { FilesByProcesso } from "./FilesByProcesso";
export { DriveLinkStats } from "./DriveLinkStats";
export { HomonymiaModal, type HomonymiaSuggestion } from "./homonymia-modal";
export { SelectAssistedModal } from "./select-assisted-modal";

// Smart Extract - Extração Inteligente de Documentos
export { SmartExtractButton, type SmartExtractButtonProps } from "./SmartExtractButton";
export { SmartExtractModal, type SmartExtractModalProps } from "./SmartExtractModal";
export { FileSelectionModal, type FileSelectionModalProps } from "./FileSelectionModal";
export { SuggestionsReviewPanel, type SuggestionsReviewPanelProps, type EntitySuggestions } from "./SuggestionsReviewPanel";
