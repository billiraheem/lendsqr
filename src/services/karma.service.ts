import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { logger } from '../utils';

/**
 * Response structure from the Adjutor Karma API.
 */
interface KarmaResponse {
  status: string;
  message: string;
  data: {
    karma_identity: string;
    amount_in_contention: string;
    reason: string;
    default_date: string;
    karma_type: string;
    karma_identity_type: string;
  } | null;
  meta: Record<string, unknown>;
}

class KarmaService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.adjutor.baseUrl;
    this.apiKey = config.adjutor.apiKey;
  }

  async isBlacklisted(identity: string): Promise<boolean> {
    try {
      const response = await axios.get<KarmaResponse>(
        `${this.baseUrl}/verification/karma/${encodeURIComponent(identity)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 10000, // 10 second timeout — don't hang forever
        }
      );

      // 200 response with data means the user IS on the blacklist
      if (response.data?.status === 'success' && response.data?.data) {
        logger.warn('User found on Karma blacklist', {
          identity,
          reason: response.data.data.reason,
          karma_type: response.data.data.karma_type,
        });
        return true;
      }

      return false;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        logger.info('User not found on Karma blacklist (clean)', { identity });
        return false;
      }

      logger.error('Karma API check failed', {
        identity,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }
}

export default new KarmaService();
