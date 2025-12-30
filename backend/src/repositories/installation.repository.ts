import { Firestore } from "@google-cloud/firestore";
import type {
  Installation,
  InstallationQuery,
  InstallationStore,
} from "@slack/oauth";
import { env } from "../config/env.js";
import { logger } from "../middleware/logger.js";

const COLLECTION_NAME = "slack_installations";

let firestore: Firestore | null = null;

function getFirestore(): Firestore {
  if (!firestore) {
    firestore = new Firestore({
      projectId: env.GCP_PROJECT_ID,
    });
  }
  return firestore;
}

function getInstallationId(
  installation: Installation<"v1" | "v2", boolean>
): string {
  if (installation.isEnterpriseInstall && installation.enterprise) {
    return installation.enterprise.id;
  }
  if (installation.team) {
    return installation.team.id;
  }
  throw new Error("Invalid installation: no team or enterprise ID");
}

export function createInstallationStore(): InstallationStore {
  return {
    storeInstallation: async (installation) => {
      const db = getFirestore();
      const installationId = getInstallationId(installation);

      logger.info({ installationId }, "Storing installation");

      await db.collection(COLLECTION_NAME).doc(installationId).set({
        installation,
        updatedAt: new Date().toISOString(),
      });
    },

    fetchInstallation: async (query: InstallationQuery<boolean>) => {
      const db = getFirestore();

      let installationId: string;
      if (query.isEnterpriseInstall && query.enterpriseId) {
        installationId = query.enterpriseId;
      } else if (query.teamId) {
        installationId = query.teamId;
      } else {
        throw new Error("Invalid query: no teamId or enterpriseId");
      }

      logger.debug({ installationId }, "Fetching installation");

      const doc = await db
        .collection(COLLECTION_NAME)
        .doc(installationId)
        .get();

      if (!doc.exists) {
        throw new Error(`Installation not found: ${installationId}`);
      }

      const data = doc.data();
      return data?.installation as Installation<"v1" | "v2", boolean>;
    },

    deleteInstallation: async (query: InstallationQuery<boolean>) => {
      const db = getFirestore();

      let installationId: string;
      if (query.isEnterpriseInstall && query.enterpriseId) {
        installationId = query.enterpriseId;
      } else if (query.teamId) {
        installationId = query.teamId;
      } else {
        throw new Error("Invalid query: no teamId or enterpriseId");
      }

      logger.info({ installationId }, "Deleting installation");

      await db.collection(COLLECTION_NAME).doc(installationId).delete();
    },
  };
}
