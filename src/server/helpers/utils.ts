import * as sgMail from '@sendgrid/mail';
import { isNaN, isNull, isUndefined, omitBy } from 'lodash';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuid } from 'uuid';

import { KEY } from './constants';
import type { CustdevItem, NotificationItem, StoredUser } from './types';

export const emailSender = (data: sgMail.MailDataRequired) => {
  sgMail.setApiKey(KEY);

  const options = omitBy(
    omitBy(
      omitBy(
        {
          ...data,
        },
        isUndefined,
      ),
      isNull,
    ),
    isNaN,
  );

  functions.logger.log(options);

  return (
    sgMail
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .send(options)
      .catch((error) => {
        console.error(error.response?.body?.errors || error);
        throw new Error(error.response?.body?.errors || error);
      })
  );
};

export const getCustdevs = async (): Promise<CustdevItem[]> => {
  return new Promise((resolve) => {
    admin
      .database()
      .ref('/custdevs')
      .once('value', async (snapshot) => {
        const custdevs: CustdevItem[] = Object.values(snapshot.val());

        if (!custdevs) {
          return Error('custdevs not found');
        }

        functions.logger.info({
          message: 'custdevs found',
        });

        return resolve(custdevs);
      });
  });
};

export const getUsers = async (): Promise<StoredUser[]> => {
  return new Promise((resolve) => {
    admin
      .database()
      .ref('/users')
      .once('value', async (snapshot) => {
        const users: StoredUser[] = Object.values(snapshot.val());

        if (!users) {
          return Error('users not found');
        }

        functions.logger.info({
          message: 'users found',
          users: users,
        });

        return resolve(users);
      });
  });
};

export const getUserById = async (userId: string): Promise<StoredUser> => {
  return new Promise((resolve) => {
    admin
      .database()
      .ref(`/users/${userId}`)
      .once('value', async (snapshot) => {
        const user: StoredUser = snapshot.val();

        if (!user) {
          return Error('user not found');
        }

        functions.logger.info({
          message: 'user found',
          user: user,
        });

        return resolve(user);
      });
  });
};

export const notify = async ({
  message,
  userId,
  link = undefined,
  date = undefined,
}: {
  message: string;
  userId: string;
  link?: string;
  date?: string;
}): Promise<void> => {
  const id = uuid();
  const notifyAt = date ?? new Date().toString();
  const notification: NotificationItem = {
    message,
    link,
    uid: id,
    date: notifyAt,
    read: false,
  };

  const notificationsRef = admin
    .database()
    .ref(`/users/${userId}/notifications/${notification.uid}`);
  // .push();

  await notificationsRef.set(
    omitBy(notification, (i) => i === '' || i === undefined || i === null),
  );
};
