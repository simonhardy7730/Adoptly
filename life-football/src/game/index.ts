// Point d'entrée des systèmes de jeu : enregistre le catalogue d'événements.
import { registerEvents } from './events';
import { EVENTS } from '../content/events';

registerEvents(EVENTS);

export * from './types';
export { createGame } from './create';
