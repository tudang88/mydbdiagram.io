import { Parser, ParseResult, ParseError } from './ParserInterface';
import { Diagram } from '../diagram/Diagram';
import { DiagramData } from '../../types/diagram.types';
import { ValidationResult } from '../../types/common.types';

/**
 * JSON Parser
 * Parses JSON string to Diagram
 */
export class JSONParser implements Parser<string, Diagram> {
  /**
   * Parse JSON string to Diagram
   */
  parse(input: string): ParseResult<Diagram> {
    try {
      const data = JSON.parse(input) as DiagramData;
      const diagram = Diagram.fromJSON(data);
      return {
        success: true,
        data: diagram,
      };
    } catch (error) {
      const errors: ParseError[] = [
        {
          message: error instanceof Error ? error.message : 'Failed to parse JSON',
        },
      ];
      return {
        success: false,
        errors,
      };
    }
  }

  /**
   * Validate JSON input
   */
  validate(input: string): ValidationResult {
    try {
      const data = JSON.parse(input);

      // Basic validation
      if (!data || typeof data !== 'object') {
        return {
          isValid: false,
          errors: [{ field: 'root', message: 'Invalid JSON structure' }],
        };
      }

      if (!data.tables || !Array.isArray(data.tables)) {
        return {
          isValid: false,
          errors: [{ field: 'tables', message: 'Tables array is required' }],
        };
      }

      return {
        isValid: true,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'root',
            message: error instanceof Error ? error.message : 'Invalid JSON',
          },
        ],
      };
    }
  }

  /**
   * Check if input can be parsed as JSON
   */
  canParse(input: unknown): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === 'object' && Array.isArray(parsed.tables);
    } catch {
      return false;
    }
  }
}
