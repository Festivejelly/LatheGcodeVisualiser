import { gapi } from 'gapi-script';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const DEFAULT_CLIENT_ID = '349142714775-v6pkei8amce6jjq4fbpu07vrcvk4k1vl.apps.googleusercontent.com';

export function initializeGoogleDriveAPI(clientId: string = DEFAULT_CLIENT_ID) {
  gapi.load('client:auth2', () => {
    gapi.client.init({
      clientId: clientId,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      scope: SCOPES,
    });
  });
}

export function signInToGoogle() {
  return gapi.auth2.getAuthInstance().signIn();
}

export function signOutFromGoogle() {
  return gapi.auth2.getAuthInstance().signOut();
}

let folderId: string | null = null;

async function getOrCreateFolder() {
  if (folderId) return folderId;

  const token = gapi.auth.getToken()?.access_token;
  if (!token) {
    throw new Error('User is not authenticated');
  }

  // Check if the folder already exists
  const searchResponse = await fetch('https://www.googleapis.com/drive/v3/files?q=name=%27LatheGcodeVisualiser%27+and+mimeType=%27application/vnd.google-apps.folder%27', {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${token}`,
    }),
  });

  const searchData = await searchResponse.json();
  const existingFolder = searchData.files?.[0];

  if (existingFolder) {
    folderId = existingFolder.id;
    return folderId;
  }

  // Create the folder if it doesn't exist
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      name: 'LatheGcodeVisualiser',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const createData = await createResponse.json();
  folderId = createData.id;
  return folderId;
}

export async function saveFileToGoogleDrive(fileName: string, content: string) {
  const fileContent = new Blob([content], { type: 'application/json' });
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [await getOrCreateFolder()],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileContent);

  const token = gapi.auth.getToken()?.access_token;
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${token}`,
    }),
    body: form,
  });

  return response.json();
}

export async function loadFileFromGoogleDrive(fileId: string) {
  const token = gapi.auth.getToken()?.access_token;
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${token}`,
    }),
  });

  return response.json();
}

export async function syncCloudToLocalStorage() {
  const token = gapi.auth.getToken()?.access_token;
  if (!token) {
    throw new Error('User is not authenticated');
  }

  // List all files in Google Drive
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${token}`,
    }),
  });

  const data = await response.json();
  const files = data.files || [];

  // Filter files for taskCollections and savedProjects
  const taskCollectionFiles = files.filter((file: any) => file.name.startsWith('taskCollections_'));
  const savedProjectFiles = files.filter((file: any) => file.name.startsWith('savedProjects_'));

  // Download and store taskCollections
  for (const file of taskCollectionFiles) {
    const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${token}`,
      }),
    });

    const content = await fileResponse.json();
    const existingValue = localStorage.getItem(file.name);

    if (existingValue) {
      const overwrite = confirm(`A local version of "${file.name}" exists. Do you want to overwrite it with the cloud version?`);
      if (!overwrite) {
        console.log(`Skipped overwriting local version of ${file.name}.`);
        continue;
      }
    }

    localStorage.setItem(file.name, JSON.stringify(content));
  }

  // Download and store savedProjects
  for (const file of savedProjectFiles) {
    const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${token}`,
      }),
    });

    const content = await fileResponse.json();
    const existingValue = localStorage.getItem(file.name);

    if (existingValue) {
      const overwrite = confirm(`A local version of "${file.name}" exists. Do you want to overwrite it with the cloud version?`);
      if (!overwrite) {
        console.log(`Skipped overwriting local version of ${file.name}.`);
        continue;
      }
    }

    localStorage.setItem(file.name, JSON.stringify(content));
  }

  console.log('Synchronization complete: taskCollections and savedProjects are now in local storage.');
}

export async function setItemAndSyncToGoogleDrive(key: string, value: any) {
  // Update localStorage
  localStorage.setItem(key, JSON.stringify(value));

  // Check if the key is for taskCollections or savedProjects
  if (key.startsWith('taskCollections_') || key.startsWith('savedProjects_')) {
    try {
      await saveFileToGoogleDrive(key, JSON.stringify(value));
      console.log(`Successfully synced ${key} to Google Drive.`);
    } catch (error) {
      console.error(`Failed to sync ${key} to Google Drive:`, error);
    }
  }
}

export async function syncLocalToCloud() {
  const token = gapi.auth.getToken()?.access_token;
  if (!token) {
    throw new Error('User is not authenticated');
  }

  // Get the folder ID for "LatheGcodeVisualiser"
  const folderId = await getOrCreateFolder();

  // List all files in the folder
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${token}`,
    }),
  });

  const data = await response.json();
  const cloudFiles = data.files.map((file: any) => file.name);

  // Get all local storage keys
  const localKeys = Object.keys(localStorage);

  // Filter for taskCollections and savedProjects
  const relevantKeys = localKeys.filter(key => key.startsWith('taskCollections_') || key.startsWith('savedProjects_'));

  // Find keys that are missing in the cloud
  const missingKeys = relevantKeys.filter(key => !cloudFiles.includes(key));

  // Upload missing keys to Google Drive
  for (const key of missingKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        await saveFileToGoogleDrive(key, value);
        console.log(`Uploaded missing file: ${key} to Google Drive.`);
      } catch (error) {
        console.error(`Failed to upload ${key} to Google Drive:`, error);
      }
    }
  }

  console.log('Local-to-cloud synchronization complete.');
}
