import { Router } from "express";
import { whatsAppService } from "../services/whatsapp";

const router = Router();

// GET /api/whatsapp/webhook - Verification Challenge
router.get("/webhook", async (req, res) => {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;

    const response = await whatsAppService.verifyWebhook(mode, token, challenge);
    if (response) {
        res.status(200).send(response);
    } else {
        res.sendStatus(403);
    }
});

// POST /api/whatsapp/webhook - Incoming Events
router.post("/webhook", async (req, res) => {
    try {
        await whatsAppService.handleWebhook(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error("WhatsApp Webhook Error:", error);
        res.sendStatus(500);
    }
});

export const whatsappRoutes = router;
