import { Question, HighScore } from './types';
import { ETHIOPIAN_GRADE_10_QUESTIONS } from './data';

// Key for storage
const STORAGE_KEY_SCORES = 'ethiopian_grade_10_high_scores';
const STORAGE_KEY_QUESTIONS = 'ethiopian_grade_10_custom_questions';

export function getHighScores(): HighScore[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SCORES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read high scores', e);
  }
  return [
    { subject: 'Physics', score: 0, totalQuestions: 5, timestamp: '-' },
    { subject: 'Chemistry', score: 0, totalQuestions: 5, timestamp: '-' },
    { subject: 'Biology', score: 0, totalQuestions: 5, timestamp: '-' }
  ];
}

export function saveHighScore(subject: string, score: number, totalQuestions: number): HighScore[] {
  const current = getHighScores();
  const index = current.findIndex(s => s.subject === subject);
  
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const newScore: HighScore = { subject, score, totalQuestions, timestamp };

  if (index !== -1) {
    // Only update if it is a new high score
    if (score > current[index].score) {
      current[index] = newScore;
    }
  } else {
    current.push(newScore);
  }

  localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(current));
  return current;
}

export function resetScores(): HighScore[] {
  const reset = [
    { subject: 'Physics', score: 0, totalQuestions: 5, timestamp: '-' },
    { subject: 'Chemistry', score: 0, totalQuestions: 5, timestamp: '-' },
    { subject: 'Biology', score: 0, totalQuestions: 5, timestamp: '-' }
  ];
  localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(reset));
  return reset;
}

// Simulated SQL console executor!
export interface SQLResult {
  columns: string[];
  rows: any[];
  error?: string;
  query: string;
}

export function executeQuery(sql: string, customQuestions: Question[] = []): SQLResult {
  const cleanSql = sql.trim().toLowerCase().replace(/;$/, '');
  const allQuestions = [...ETHIOPIAN_GRADE_10_QUESTIONS, ...customQuestions];
  const scores = getHighScores();

  try {
    // Basic Parsing
    if (cleanSql.startsWith('select')) {
      // Find table name
      const fromMatch = cleanSql.match(/\bfrom\s+(\w+)\b/);
      if (!fromMatch) {
        throw new Error('Could not parse table name in query. Try "SELECT * FROM questions"');
      }
      
      const tableName = fromMatch[1];
      let dataset: any[] = [];
      
      if (tableName === 'questions') {
        dataset = allQuestions.map(q => ({
          id: q.id,
          subject: q.subject,
          topic: q.topic,
          question: q.text.substring(0, 40) + '...',
          answer_idx: q.correctAnswerIndex
        }));
      } else if (tableName === 'quiz_scores' || tableName === 'high_scores') {
        dataset = scores.map((s, idx) => ({
          id: idx + 1,
          subject: s.subject,
          high_score: s.score,
          total_questions: s.totalQuestions,
          updated_at: s.timestamp
        }));
      } else {
        throw new Error(`Table "${tableName}" not found. Available tables: [questions, quiz_scores]`);
      }

      // Handle simple WHERE filters
      const whereMatch = cleanSql.match(/\bwhere\s+(\w+)\s*=\s*['"]?([^'"]+)['"]?/);
      if (whereMatch) {
        const column = whereMatch[1];
        const value = whereMatch[2].toLowerCase();
        
        dataset = dataset.filter(row => {
          const cellVal = String(row[column] || '').toLowerCase();
          return cellVal === value;
        });
      }

      // Handle LIMIT
      const limitMatch = cleanSql.match(/\blimit\s+(\d+)\b/);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1], 10);
        dataset = dataset.slice(0, limit);
      }

      if (dataset.length === 0) {
        return {
          columns: ['status'],
          rows: [['Query returned empty result set']],
          query: sql
        };
      }

      const columns = Object.keys(dataset[0]);
      const rows = dataset.map(row => columns.map(col => row[col]));

      return { columns, rows, query: sql };
    } 
    
    if (cleanSql.startsWith('insert')) {
      throw new Error('INSERT operations are restricted in read-only visual inspection console. Use UI forms to add custom content.');
    }

    if (cleanSql.startsWith('update')) {
      throw new Error('UPDATE is disabled. Modifications must be handled by simulated Room Database persistence layers.');
    }

    if (cleanSql.startsWith('delete')) {
      throw new Error('DELETE queries are restricted to safeguard critical curriculum seeds.');
    }

    throw new Error('Unsupported command. This simulated editor supports SELECT. Example: "SELECT * FROM questions WHERE subject = \'Biology\'"');
    
  } catch (error: any) {
    return {
      columns: ['sql_error'],
      rows: [[error.message || 'Syntax error in SQL']],
      query: sql,
      error: error.message
    };
  }
}
