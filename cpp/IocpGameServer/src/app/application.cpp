#include "application.hpp"
#include "../server/include/socket.hpp"
#include "../server/include/packet_message.hpp"
#include "apis/include/packet_handler_base.hpp"
#include "apis/include/set_user.hpp"
#include "apis/include/chat.hpp"
#include "apis/include/error.hpp"

namespace IocpGameServer {
	const unsigned char Error::kProtocol;
	const unsigned char SetUser::kProtocol;
	const unsigned char Chat::kProtocol;
	
	Application::Application(bool logging) : logging_(logging) {
		packet_handlers_[Error::kProtocol] = std::make_unique<Error>();
		packet_handlers_[SetUser::kProtocol] = std::make_unique<SetUser>();
		packet_handlers_[Chat::kProtocol] = std::make_unique<Chat>();
	}

	void Application::AddSocket(SOCKET socket_id, std::shared_ptr<Socket> socket) {
		std::scoped_lock lock(lock_);
		sockets_[socket_id] = socket;
	}
	void Application::DeleteSocket(SOCKET socket_id) {
		std::scoped_lock lock(lock_);
		sockets_.erase(socket_id);
	}
	std::shared_ptr<Socket> Application::GetSocket(SOCKET socket_id) noexcept {
		try {
			std::shared_lock lock(lock_);
			return sockets_.at(socket_id);
		}
		catch (std::out_of_range err) {
			return nullptr;
		}
	}
	void Application::ChatBroadcast(const unsigned char protocol, const std::string& chat_message) const {
		std::shared_lock lock(lock_);
		for (auto iter = sockets_.begin(); iter != sockets_.end(); iter++) {
			iter->second->Send(protocol, chat_message);
		}
	}
	PacketHandlerBase& Application::GetPacketHandler(const unsigned char protocol) noexcept {
		try {
			return *packet_handlers_.at(protocol);
		}
		catch (std::out_of_range err) {
			return *packet_handlers_.at(Error::kProtocol);
		}
	}

} //namespace IocpGameServer