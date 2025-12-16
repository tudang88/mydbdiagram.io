import { Diagram } from '../diagram/Diagram';
import { ValidationResult } from '../../types/common.types';

/**
 * Parse result
 */
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors?: ParseError[];
}

/**
 * Parse error
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Parser interface
 */
export interface Parser<TInput, TOutput = Diagram> {
  /**
   * Parse input to output
   */
  parse(input: TInput): ParseResult<TOutput>;

  /**
   * Validate input
   */
  validate(input: TInput): ValidationResult;

  /**
   * Check if input can be parsed
   */
  canParse(input: unknown): boolean;
}

