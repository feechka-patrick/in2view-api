import { admin } from '@server/firebase/admin';
import { eventHandlers } from '@server/helpers/eventHandlers';
import { entries, first } from 'lodash';
import { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const event = req.body.event as string;
    if (!event) {
        res.status(400).send('event is required');
        return;
    }

    const handler = eventHandlers[event];
    if (!handler) {
        res.status(400).send(`event ${event} is not supported`);
        return;
    }

    try {
        await handler(req.body.object);
        res.status(200).send('success');
    } catch (error) {
        res.status(500).send(error);
    }
}

export default handler;