import { admin } from "@server/firebase/admin";
import { addMonths } from "date-fns";
import { defaultEmailFrom } from "./constants";
import { subscriptionPlan } from "./subscriptionPlan";
import { emailSender, notify } from "./utils";

export const eventHandlers: Record<string, any> = {
    'payment.succeeded': async (body: any) => {
        console.log('eventHandlers start');

        const payment = await admin
            .database()
            .ref(`/payments/${body?.id}`)
            .get()
            .then((snapshot) => {
                const payment = snapshot.val();
                if (!payment) return null;
                return payment;
            })
            .catch((error) => {
                throw new Error(error);
            });

        if (!payment) return;

        const { userId, userEmail, type } = payment;

        console.log({ payment });


        // notify user
        await emailSender({
            to: userEmail,
            from: defaultEmailFrom,
            subject: 'Оплата прошла успешно',
            html: `<p>
            Привет! Оплата тарифа прошла успешно, теперь вы можете пользоваться нашим сервисом.
            Команда in2view
          </p>`,
        });

        await notify({
            message: 'Оплата прошла успешно!',
            userId,
            date: new Date().toString(),
        });

        const updatedUser = {
            paymentMethod: body.payment_method,
            subscriptionAmount: body.amount.value,
            subscriptionPlanUid: type,
            subscriptionExpiresAt: addMonths(new Date(), 1).toISOString(),
            availableCustdevs: subscriptionPlan[type].availableCustdevs,
            respondentsPerCustdev: subscriptionPlan[type].respondentsPerCustdev,
        };

        // set user flag
        admin.database().ref(`/users/${userId}/subscription`).remove();

        admin
            .database()
            .ref(`/users/${userId}/subscription`)
            .set(updatedUser)
            // eslint-disable-next-line no-console
            .then(() => console.log('user updated'))
            .catch((e) => {
                throw new Error(e);
            });

        // save users payment method
        admin
            .database()
            .ref(`/users/${userId}/paymentMethods`)
            .push(payment.payment_method);

        // save transition details
        await admin
            .database()
            .ref(`/payments/${body?.id}`)
            .set({
                ...body,
                userId,
                userEmail,
            });
    },
};