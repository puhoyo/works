#include "include/chat.hpp"
#include "../application.hpp"
#include "../lib/include/user.hpp"

namespace IocpGameServer {

	void Chat::handle(std::shared_ptr<User> user, std::string data) {
		const std::string chat("(" + user->GetName() + ") " + data);

		user->GetApp().ChatBroadcast(kProtocol, chat);
	}

} //namespace IocpGameServer