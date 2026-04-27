import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import ExamList from "@/pages/ExamList";
import Instructions from "@/pages/Instructions";
import Exam from "@/pages/Exam";
import Result from "@/pages/Result";
import Admin from "@/pages/Admin";
import CompleteProfile from "@/pages/CompleteProfile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route path="/exams" component={ExamList} />
      <Route path="/instructions/:examId" component={Instructions} />
      <Route path="/exam" component={Exam} />
      <Route path="/result/:submissionId" component={Result} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
