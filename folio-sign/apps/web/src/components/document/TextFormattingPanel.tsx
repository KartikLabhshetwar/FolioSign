import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Bold, 
  Italic, 
  Underline, 
  Copy, 
  Trash2, 
  Type,
  Palette
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isEditing: boolean;
  fontFamily: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

interface TextFormattingPanelProps {
  selectedElement: TextElement | null;
  onUpdateFormatting: (id: string, formatting: Partial<Omit<TextElement, 'id' | 'text' | 'x' | 'y' | 'isEditing'>>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Courier New'
];

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#008000', '#800000', '#000080', '#808080', '#C0C0C0'
];

export function TextFormattingPanel({ 
  selectedElement, 
  onUpdateFormatting, 
  onDuplicate, 
  onDelete 
}: TextFormattingPanelProps) {
  if (!selectedElement) {
    return (
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Type className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Select a text element to format</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Type className="h-4 w-4" />
          Text Formatting
        </h3>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Font Family</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              {selectedElement.fontFamily}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            {FONT_FAMILIES.map((font) => (
              <DropdownMenuItem
                key={font}
                onClick={() => onUpdateFormatting(selectedElement.id, { fontFamily: font })}
                style={{ fontFamily: font }}
              >
                {font}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Font Size</Label>
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={selectedElement.fontSize}
            onChange={(e) => onUpdateFormatting(selectedElement.id, { fontSize: parseInt(e.target.value) || 16 })}
            className="w-20"
            min="8"
            max="72"
          />
          <span className="text-xs text-gray-500">px</span>
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Text Color</Label>
        <div className="flex items-center space-x-2">
          <input
            type="color"
            value={selectedElement.color}
            onChange={(e) => onUpdateFormatting(selectedElement.id, { color: e.target.value })}
            className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
          />
          <Input
            type="text"
            value={selectedElement.color}
            onChange={(e) => onUpdateFormatting(selectedElement.id, { color: e.target.value })}
            className="flex-1 text-xs"
            placeholder="#000000"
          />
        </div>
        <div className="grid grid-cols-5 gap-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => onUpdateFormatting(selectedElement.id, { color })}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Text Style */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Text Style</Label>
        <div className="flex items-center space-x-1">
          <Button
            variant={selectedElement.isBold ? "default" : "outline"}
            size="sm"
            onClick={() => onUpdateFormatting(selectedElement.id, { isBold: !selectedElement.isBold })}
            className="flex-1"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedElement.isItalic ? "default" : "outline"}
            size="sm"
            onClick={() => onUpdateFormatting(selectedElement.id, { isItalic: !selectedElement.isItalic })}
            className="flex-1"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedElement.isUnderline ? "default" : "outline"}
            size="sm"
            onClick={() => onUpdateFormatting(selectedElement.id, { isUnderline: !selectedElement.isUnderline })}
            className="flex-1"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Label className="text-xs font-medium">Actions</Label>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(selectedElement.id)}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(selectedElement.id)}
            className="flex-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Label className="text-xs font-medium">Preview</Label>
        <div className="p-3 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900">
          <span
            style={{
              fontFamily: selectedElement.fontFamily,
              fontSize: selectedElement.fontSize,
              color: selectedElement.color,
              fontWeight: selectedElement.isBold ? 'bold' : 'normal',
              fontStyle: selectedElement.isItalic ? 'italic' : 'normal',
              textDecoration: selectedElement.isUnderline ? 'underline' : 'none',
            }}
          >
            {selectedElement.text || 'Sample Text'}
          </span>
        </div>
      </div>
    </div>
  );
} 