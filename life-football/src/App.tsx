import { useGame } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import { CreateWizard } from './screens/CreateWizard';
import { GameShell } from './screens/GameShell';
import { Toasts } from './ui/Toasts';
import { DemoMatchScreen } from './screens/DemoMatchScreen';

export function App() {
  const screen = useGame((s) => s.screen);
  return (
    <>
      {screen === 'menu' && <MainMenu />}
      {screen === 'create' && <CreateWizard />}
      {screen === 'game' && <GameShell />}
      {screen === 'demo' && <DemoMatchScreen />}
      <Toasts />
    </>
  );
}
