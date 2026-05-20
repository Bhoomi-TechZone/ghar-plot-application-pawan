import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAppVersion, openStore } from '../services/versionService';

const LATER_COUNT_KEY = 'app_update_later_count';
const LATER_VERSION_KEY = 'app_update_later_version';
const MAX_LATER_COUNT = 3;

const useAppVersionCheck = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Skip if no internet
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          setIsChecking(false);
          return;
        }

        const info = await checkAppVersion();
        
        if (info && info.isUpdateAvailable) {
          // Check how many times user pressed "Later" for this version
          const savedVersion = await AsyncStorage.getItem(LATER_VERSION_KEY);
          let laterCount = parseInt(await AsyncStorage.getItem(LATER_COUNT_KEY) || '0', 10);

          // Reset counter if a newer version is detected
          if (savedVersion !== info.latestVersion) {
            laterCount = 0;
            await AsyncStorage.setItem(LATER_VERSION_KEY, info.latestVersion);
            await AsyncStorage.setItem(LATER_COUNT_KEY, '0');
          }

          // Force update if user already pressed Later 3 times or API says forceUpdate
          const shouldForce = laterCount >= MAX_LATER_COUNT || info.forceUpdate;

          setUpdateInfo(info);
          setForceUpdate(shouldForce);
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.error('App version check failed silently:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkVersion();
  }, []);

  const handleLater = async () => {
    try {
      const currentCount = parseInt(await AsyncStorage.getItem(LATER_COUNT_KEY) || '0', 10);
      const newCount = currentCount + 1;
      await AsyncStorage.setItem(LATER_COUNT_KEY, String(newCount));
    } catch (e) {
      console.warn('Failed to save later count:', e);
    }
    setShowUpdateModal(false);
  };

  const handleUpdate = () => {
    openStore(updateInfo?.storeUrl);
  };

  return {
    showUpdateModal,
    updateInfo,
    forceUpdate,
    isChecking,
    handleLater,
    handleUpdate
  };
};

export default useAppVersionCheck;
