import * as functions from 'firebase-functions';
import fetch from 'cross-fetch';
import { v4 as uuid } from 'uuid';
// import subscr from '../../src/shared/lib/prices';
// import { getFunctions, httpsCallable } from 'firebase/functions';

import {
  isFuture,
  isPast,
  subHours,
  addDays,
  differenceInDays,
  addHours,
  addMinutes,
  format,
  addMonths,
} from 'date-fns';

import type { CustomClaims } from './types';
import { defaultEmailFrom } from './constants';

import {
  emailSender,
  notify,
  getCustdevs,
  getUserById,
  getUsers,
} from './utils';
import { eventHandlers } from './eventHandlers';
import { admin } from '@server/firebase/admin';
import { subscriptionPlan } from './subscriptionPlan';

// admin.initializeApp();


// export const paymentEventHandler = functions.https.onRequest(
//   async (req, res) => {
//     const event = req.body.event as string;
//     if (!event) {
//       res.status(400).send('event is required');
//       return;
//     }

//     const handler = eventHandlers[event];
//     if (!handler) {
//       res.status(400).send(`event ${event} is not supported`);
//       return;
//     }

//     try {
//       await handler(req.body.object);
//       res.status(200).send('success');
//     } catch (error) {
//       res.status(500).send(error);
//     }
//   },
// );

export const getPaymentToken = functions.https.onCall(async (data, context) => {
  // console.log('getPaymentToken start');

  const str = `900830:test_c2uheTF4HYByW8D7mmm2AUz7jwEPMWvnwS22DEHAjuw`;
  const buff = Buffer.from(str);
  const base64data = buff.toString('base64');

  const amount = data.amount || 1;
  const uid = data.uid;
  const email = data.email;

  const user = await getUserById(uid);
  console.log(user?.subscription?.paymentMethod);

  const res = !(user?.subscription?.paymentMethod) ? await fetch('https://api.yookassa.ru/v3/payments', {
    // const res = await fetch('https://api.yookassa.ru/v3/payments', {
    body: JSON.stringify({
      amount: { value: amount, currency: 'RUB' },
      confirmation: { type: 'embedded' },
      capture: true,
      description: `Montly in2view subscription from ${format(
        new Date(),
        'MMM yyyy',
      )}`,
      save_payment_method: true,
    }),
    headers: {
      Authorization: `Basic ${base64data}`,
      'Content-Type': 'application/json',
      'Idempotence-Key': uuid(),
    },
    method: 'POST',
  }).then((r) => r.json())
    : // если автоматический платеж
    await fetch('https://api.yookassa.ru/v3/payments', {
      body: JSON.stringify({
        amount: { value: amount, currency: 'RUB' },
        confirmation: { type: 'embedded' },
        capture: true,
        description: `Montly in2view subscription from ${format(
          new Date(),
          'MMM yyyy',
        )}`,
        payment_method_id: user?.subscription?.paymentMethod,
      }),
      headers: {
        Authorization: `Basic ${base64data}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': uuid(),
      },
      method: 'POST',
    }).then((r) => r.json());


  const paymentToken = res?.confirmation?.confirmation_token || null;

  if (res.id) {
    // save token to realtime db to track user payment
    await admin
      .database()
      .ref(`/payments/${res.id}`)
      .set({
        ...res,
        userId: uid,
        userEmail: email,
        type: data.type,
      });
  }

  return paymentToken;
});

export const sendEmail = functions.https.onCall((data, context) =>
  emailSender(data)
    .then(() => {
      functions.logger.log('Email sent successfully');
    })
    .catch((error) => {
      functions.logger.error(error);
      throw new Error(error);
    }),
);

export const processSignUp = functions.auth.user().onCreate(async (user) => {
  const customClaims: CustomClaims = {
    role: 'unset',
  };

  if (user.email && user.email.endsWith('@in2view.ru')) {
    customClaims.role = 'admin';
  }

  try {
    await admin.auth().setCustomUserClaims(user.uid, customClaims);

    const signUpAt = new Date();
    const dayNotifyAt = addDays(signUpAt, 1).getTime();

    await emailSender({
      to: user.email,
      from: defaultEmailFrom,
      subject: 'Справочный центр IN2VIEW',
      html: `<p>
        Привет! Это второе из трех писем, которые мы отправим, чтобы помочь тебе провести кастдев
        Теперь все самое нужное и важное про работу на платформе IN2VIEW.
        Пошаговая инструкция со скринами, как пользоваться IN2VIEW
        <a href="https://in2view.web.app/create-custdev">Создать кастдев</a>
        Команда in2view
      </p>`,
      sendAt: dayNotifyAt,
    });

    await notify({
      message: 'Рассказываем, что делать дальше',
      userId: user.uid,
      date: dayNotifyAt.toString(),
    });

    await emailSender({
      to: user.email,
      from: defaultEmailFrom,
      subject: 'Триал-период завершен',
      html: `<p>
        Привет!
        Поделись эмоциями. Сколько времени занял поиск респондентов?
        Успел уже сравнить с тем временем, которое бы тебе понадобилось на привлечение респондентов старым способом?
        Расскажи нам о своем опыте
        
        ссылка на опрос про продукт
        ссылка на опрос про прошедшее интервью
        
        Ну, а мы в знак благодарности пришлем промокод на 21% скидку на подписку IN2VIEW на первый месяц, если пройдешь оба опроса.
        
        Кнопка «получить промокод» (ведет на опрос)
        
        Команда in2view
      </p>`,
      sendAt: dayNotifyAt,
    });

    const secondDayNotifyAt = addDays(signUpAt, 2).getTime();

    await emailSender({
      to: user.email,
      from: defaultEmailFrom,
      subject: 'IN2VIEW Education',
      html: `<p>
      Добрый день! Это третье из трех писем, которые мы отправим, чтобы помочь тебе провести кастдев<br>
      Проводишь кастдев по учебнику? Прошел курс по исследованию ЦА?<br>
      Мы собрали для тебя базу знаний, которую активно пополняем, чтобы твой пользовательский опыт с in2view был на запределельно высоком уровне!<br><br>
     
      ссылка на базу знаний<br>
      популярные статьи по теме рекрутмента / проведение кастдева и тп<br>
      чек-лист «как провести кастдев»<br><br>
     
      <a href="https://in2view.web.app/create-custdev">Создать кастдев</a>
      
      <br><br>Команда in2view
      </p>`,
      sendAt: secondDayNotifyAt,
    });
  } catch (error) {
    console.error(error);
  }
});

export const processUserUpdate = functions.database
  .ref('/users/{userId}')
  .onUpdate(async (snapshot, context) => {
    const userId = context.auth?.uid;

    if (!userId) {
      return;
    }

    const value = snapshot.after.val();

    const customClaims: CustomClaims = {
      role: value.role ?? 'unset',
    };

    await admin.auth().setCustomUserClaims(userId, customClaims);
  });

export const removeSubscriptionInfo = functions.https.onCall(async (data, context) => {
  const userId = data.user.uid;

  if (data.user) {
    admin.database().ref(`/users/${userId}/subscription/paymentMethod`).remove();

    const updatedUser = subscriptionPlan['none'];

    admin
      .database()
      .ref(`/users/${userId}/subscription`)
      .set(updatedUser)
      .then(() => console.log('user updated'))
      .catch((e) => {
        throw new Error(e);
      });

    console.log('Платёжная информация удалена');

    await notify({
      message:
        'Платёжная информация удалена, для возобновления подписки, выберите и оплатите тариф',
      userId: userId,
    });
  }
});

export const scheduledNotifications = functions.pubsub
  // каждый день в 0:00
  .schedule('0 0 * * *')
  .onRun(async (context) => {
    const custdevs = await getCustdevs();
    const users = await getUsers();

    // уведомления о предстоящих кастдевах
    custdevs.map(async (custdev) => {
      if (!custdev.userId) {
        return;
      }

      const client = await getUserById(custdev.userId);

      const respondentApplications = Object.values(custdev?.respondents || {});

      respondentApplications.map(async (respondentApplication, index) => {
        const userId = index.toString();
        const respondent = await getUserById(userId);
        const custdevAt = respondentApplication.date
          ? new Date(respondentApplication.date)
          : new Date();

        if (isPast(custdevAt)) {
          return;
        }

        const diffDays = differenceInDays(custdevAt, new Date());

        if (diffDays !== 1) {
          return;
        }

        await emailSender({
          to: client.email,
          from: defaultEmailFrom,
          subject: 'Скоро кастдев',
          html: `<p>
            Привет! Напоминаем, что до интервью осталось 24 часа!
            Перед интервью рекомендуем проверить, насколько ты готов провести кастдев.
            
            ссылка на статью с полезными инструментами
            чек-лист «как провести кастдев»
            
            Команда in2view
          </p>`,
        });

        await notify({
          message: 'Интервью уже через сутки!',
          userId: client.uid,
        });

        await emailSender({
          to: respondent.email,
          from: defaultEmailFrom,
          subject: `Напоминаем об интервью в ${custdevAt.toDateString()} ${custdevAt.toTimeString()}`,
          html: `<p>
            Напоминаем, что завтра ${custdevAt.toDateString()} ${custdevAt.toTimeString()} 
            по московскому времени состоится интервью ${custdev.title}
          </p>`,
        });

        await notify({
          message: `
          Напоминание: Интервью ${custdev.title}  
          завтра в ${custdevAt.toDateString()} ${custdevAt.toTimeString()}`,
          userId: respondent.uid,
        });

        const hourNotifyAt = subHours(custdevAt, 1);

        if (isFuture(hourNotifyAt)) {
          await emailSender({
            to: client.email,
            from: defaultEmailFrom,
            subject: 'Скоро кастдев',
            html: `<p>
              Привет! Напоминаем, что до интервью остался 1 час!<br/>
              Не забудь после интервью оценить респондента ;)
            
              <br/><br/>Команда in2view
            </p>`,
            sendAt: hourNotifyAt.getTime(),
          });

          await notify({
            message: 'Friendly reminder: через час интервью!',
            userId: client.uid,
            date: hourNotifyAt.toString(),
          });

          await emailSender({
            to: respondent.email,
            from: defaultEmailFrom,
            subject: 'Скоро кастдев',
            html: `<p>
              Напоминаем, ты записан на интервью сегодня
              в ${hourNotifyAt.toDateString()} ${hourNotifyAt.toTimeString()} по Москве!<br><br>
              
              Ожидаем подключения за 5 минут до начала.
              
              <br><br>До встречи!
            </p>`,
            sendAt: hourNotifyAt.getTime(),
          });

          await notify({
            message: `Напоминание: Интервью ${custdev.title} состоится через 1 час`,
            userId: respondent.uid,
            date: hourNotifyAt.toString(),
          });
        }

        const custdevDoneAt = addMinutes(
          addHours(custdevAt, custdev.duration.hours),
          custdev.duration.minutes,
        );

        await emailSender({
          to: client.email,
          from: defaultEmailFrom,
          subject: 'Оцените качество кастдева',
          html: `<p>
            Благодарим за участие в интервью ${custdev.title}.<br>
            
            Нам будет очень приятно получить от тебя обратную связь по прошедшему интервью и его организации.
          
            <br><br>Хорошего дня!
          </p>`,
          sendAt: custdevDoneAt.getTime(),
        });

        await notify({
          message: 'Ну что, как всё прошло?',
          userId: client.uid,
          date: custdevDoneAt.toString(),
        });

        await emailSender({
          to: respondent.email,
          from: defaultEmailFrom,
          subject: 'Оцените качество кастдева',
          html: `<p>
            Благодарим за участие в интервью ${custdev.title}.<br>
              
            Нам будет очень приятно получить от тебя обратную связь по прошедшему интервью и его организации.
            
            <br><br>Хорошего дня!
          </p>`,
          sendAt: custdevDoneAt.getTime(),
        });

        await notify({
          message: 'Твоя обратная связь поможет нам совершенствоваться!',
          userId: respondent.uid,
          date: custdevDoneAt.toString(),
        });
      });
    });

    users.map(async (user) => {
      if (!user.email) {
        return;
      }

      const custdevCreationNotify = async () => {
        const custdevLastCreatedAt = user.account.custdevLastCreatedAt
          ? new Date(user.account.custdevLastCreatedAt)
          : new Date(user.createdAt);

        const diffDays = differenceInDays(new Date(), custdevLastCreatedAt);

        switch (diffDays) {
          case 3:
            await emailSender({
              to: user.email,
              from: defaultEmailFrom,
              subject: 'Вы не создавали кастдевов уже 3 дня',
              html: `<p>
                  Привет!<br>
                  Меня зовут Денис – я основатель и CEO in2view.<br>
                  К сожалению, с момента регистрации на твоем аккаунте не было никакой активности :(<br><br>
                
                  Вероятно, мы сделали что-то не так? Или не помогли разобраться
                  и ты потерялся в куче багов, которыми славятся MVP?<br>
                  Расскажи. <br>Напиши мне в личку в телеграм <a href="https://t.me/dnspirin">@dnspirin</a>
                <br><br>
                  <a href="#">Закидать какашками</a>
                
                  <br><br>Денис Спирин
                </p>`,
            });
            break;
          default:
            break;
        }
      };

      const bonusesSpendNotify = async () => {
        const bonusesLastUpdatedAt = user.account.bonusesLastUpdatedAt
          ? new Date(user.account.bonusesLastUpdatedAt)
          : null;

        if (bonusesLastUpdatedAt && user.account.bonuses > 0) {
          const diffDays = differenceInDays(new Date(), bonusesLastUpdatedAt);

          switch (diffDays) {
            case 7:
            case 14:
              await emailSender({
                to: user.email,
                from: defaultEmailFrom,
                subject:
                  'У вас есть бонусы, а у нас классные промокоды! Поменяемся?',
                html: `<p>
                Напоминаем, что на твоем бонусном счету ${user.account.bonuses} монет.<br>
                Не упусти возможность обменять их на уникальные промокоды от наших партнеров.<br><br>
               
                Переходи по <a href="https://in2view.web.app/gifts">ссылке</a>, чтобы ознакомиться с ними!
                </p>`,
              });

              await notify({
                message: `У тебя есть ${user.account.bonuses} монет, а у нас есть классные промокоды! Поменяемся?`,
                userId: user.uid,
              });
              break;
            default:
              break;
          }
        }
      };

      const subscriptionNotify = async () => {
        const subscriptionExpiresAt = user.subscription.expiresAt
          ? new Date(user.subscription.expiresAt)
          : null;
        const subscriptionType = user.subscription.subscriptionPlanUid;

        if (subscriptionExpiresAt) {
          const diffDays = differenceInDays(subscriptionExpiresAt, new Date());

          if (subscriptionType === 'trial') {
            switch (diffDays) {
              case 1:
                await emailSender({
                  to: user.email,
                  from: defaultEmailFrom,
                  subject: 'Подписка истекает через 1 день',
                  html: `<p>
                    Привет!<br>
                    Завтра (!!!) закончится твоя подписка на in2view.<br>
                    Чтобы не потерять возможность оперативно привлекать респондентов на живое интервью, рекомендуем продлить подписку.<br><br>
                    
                    <a href="https://in2view.web.app/me/pricing">Получить респондентов</a>
                    
                    <br><br>Команда in2view
                </p>`,
                });

                await notify({
                  message: 'Не бросай нас!',
                  userId: user.uid,
                });
                break;
              case 7:
                await emailSender({
                  to: user.email,
                  from: defaultEmailFrom,
                  subject: 'Подписка истекает через 7 дней',
                  html: `<p>
                  Привет!<br>
                  Скоро закончится твоя подписка на in2view.<br>
                  Чтобы не потерять возможность оперативно привлекать респондентов на живое интервью, рекомендуем продлить подписку.<br><br>
      
                  <a href="https://in2view.web.app/me/pricing">Получить респондентов</a>
                
                  <br><br>Команда in2view
                </p>`,
                });

                await notify({
                  message: '7 дней. У тебя есть 7 дней.',
                  userId: user.uid,
                });
                break;
              default:
                break;
            }
          } else if (subscriptionType === 'startup' ||
            subscriptionType === 'agency') {
            if (diffDays <= 0) {
              // const functions = getFunctions();
              // const getPaymentToken = httpsCallable(functions, 'getPaymentToken');
              // const token = getPaymentToken({
              //   userId: user.uid,
              //   amount: prices[user.subscription.subscriptionPlanUid],
              //   email: user.email!,
              //   type: user.subscription.subscriptionPlanUid,
              // });

              // console.log(token);

              // если все прошло хорошо
              // обновить данные
              // если нет - обнулить подписку
            } else if (diffDays === 3) {
              await emailSender({
                to: user.email,
                from: defaultEmailFrom,
                subject: 'Автоплатеж будет совершен через 3 дня',
                html: `<p>
                Привет!<br>
                Через три дня будет совершен автоплатеж, продлевающий подписку на сервис по подбору респондентов IN2VIEW.<br><br>
              
                <a href="https://in2view.web.app/me/pricing">Подробнее об условиях подписки</a>
              
                <br><br>Команда in2view
              </p>`,
              });

              await notify({
                message: 'Автоматическое продление подписки',
                userId: user.uid,
              });
            }
          }
        }

        if (user.role === 'client' || user.role === 'admin') {
          await custdevCreationNotify();
          await subscriptionNotify();
        }

        if (user.role === 'respondent' || user.role === 'admin') {
          await bonusesSpendNotify();
        }
      };
    });
  });


